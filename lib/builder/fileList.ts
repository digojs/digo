/**
 * @fileOverview 文件列表
 * @author xuld <xuld@vip.qq.com>
 */
import { EventEmitter } from "events";
import { Matcher, Pattern } from "../utility/matcher";
import { relativePath, resolvePath, pathEquals } from "../utility/path";
import { AsyncQueue } from "../utility/asyncQueue";
import { begin, end } from "./progress";
import { plugin } from "./plugin";
import { File } from "./file";

/**
 * 表示一个文件列表。
 */
export class FileList extends EventEmitter {

    /**
     * 获取当前列表关联的异步队列。
     */
    readonly asyncQueue: AsyncQueue;

    /**
     * 初始化新的文件列表。
     * @param asyncQueue 当前列表关联的异步队列。
     */
    constructor(asyncQueue?: AsyncQueue) {
        super();
        if (asyncQueue) {
            this.asyncQueue = asyncQueue;
            asyncQueue.lock();
        }
    }

    /**
     * 获取已添加的所有文件。
     */
    files: File[] = [];

    /**
     * 在当前列表添加一个文件。
     * @param file 要添加的文件。
     */
    add(file: File) {
        this.files.push(file);
        this.emit("data", file);
    }

    /**
     * 获取当前列表是否已处理完成。
     */
    protected ended: boolean;

    /**
     * 标记所有文件都已添加。
     */
    end() {
        this.ended = true;
        this.emit("end", this.files);
        if (this.asyncQueue) {
            this.asyncQueue.unlock();
        }
    }

    /**
     * 获取当前列表中的指定文件。
     * @param path 要获取的文件路径。
     * @return 返回文件对象。如果找不到则返回 undefined。
     */
    get(path: string) {
        path = resolvePath(path);
        for (const file of this.files) {
            if (pathEquals(file.path, path)) {
                return file;
            }
        }
    }

    /**
     * 绑定一个事件。
     * @param event 要添加的事件名。
     * @param listener 要添加的事件监听器。
     */
    on(event: "data", listener: (file: File) => void);

    /**
     * 绑定一个事件。
     * @param event 要添加的事件名。
     * @param listener 要添加的事件监听器。
     */
    on(event: "end", listener: (files: File[]) => void);

    /**
     * 绑定一个事件。
     * @param event 要添加的事件名。
     * @param listener 要添加的事件监听器。
     */
    on(event: string, listener: Function);

    /**
     * 绑定一个事件。
     * @param event 要添加的事件名。
     * @param listener 要添加的事件监听器。
     */
    on(event: string, listener: Function) {
        super.on(event, listener);

        // 允许事件触发后再绑定事件。
        switch (event) {
            case "data":
                for (const file of this.files) {
                    listener.call(this, file);
                }
                break;
            case "end":
                if (this.ended) {
                    listener.call(this, this.files);
                }
                break;
        }

        return this;
    }

    /**
     * 存储当前列表正在等待的子列表。
     */
    private activeList: FileList;

    /**
     * 将所有文件传递给目标文件列表或处理器。
     * @param processor 目标文件列表或处理器。
     * @param options 传递给处理器的只读配置对象。
     * @param load 是否在处理前载入文件内容。
     * @return 返回新的文件列表。
     */
    pipe<T>(processor: Processor<T>, options?: T, load?: boolean): FileList {

        // .pipe("..."): 支持直接写插件名。
        while (typeof processor === "string") {
            processor = plugin(processor);
        }

        // .pipe(fileList): 标准流行为。
        if (processor instanceof FileList) {
            this.on("data", file => (<FileList>processor).add(file));
            this.on("end", file => (<FileList>processor).end());
            return processor;
        }

        // 载入文件内容。
        if (load !== false && processor.load !== false) {
            return this.pipe((file, options, done) => {
                file.load((error, file) => {
                    if (error) {
                        file.error(error);
                    }
                    done();
                });
            }, options, false).pipe(processor, options, false);
        }

        // 补齐默认参数。
        if (options === undefined) {
            options = <T>defaultProcessorOptions;
        }

        // 查询当前激活的子列表。
        let active = this.activeList;
        if (active) {
            while (active.activeList) {
                active = active.activeList;
            }
        }

        // 创建结果列表。
        const result = this.activeList = new FileList(this.asyncQueue);

        // .pipe(file => ...)
        if (typeof processor === "function") {

            let pending = 1; // 需要等待所有 data 事件 + 1 个 end 事件。

            const onData = (file: File) => {
                pending++;
                const taskId = (<Function>processor).name && begin("{default:processor}: {file}", {
                    processor: (<Function>processor).name,
                    file: file.toString()
                });
                function done() {
                    taskId && end(taskId);
                    result.add(file);
                    onEnd();
                }
                if ((<Function>processor).length < 3) {
                    try {
                        (<Function>processor)(file, options, null, this, result);
                    } catch (e) {
                        file.error({
                            plugin: (<Function>processor).name,
                            error: e
                        });
                    }
                    done();
                } else {
                    try {
                        (<Function>processor)(file, options, done, this, result);
                    } catch (e) {
                        file.error({
                            plugin: (<Function>processor).name,
                            error: e
                        });
                        done();
                    }
                }
            };

            const onEnd = () => {
                if (--pending > 0) return;
                result.end();
            };

            if (active) {
                // active 存储了上一次 pipe 的结果列表。
                // 实际当前操作是 pipe 到 active 的。
                this.on("end", files => {
                    const all = files.slice();
                    let left = all.length;
                    active.on("data", file => {
                        const p = all.indexOf(file);
                        if (p >= 0 && all[p]) {
                            all[p] = null;
                            left--;
                            onData(file);
                            // 如果当前列表所有文件都已处理完成，则无需等待激活列表的 end 事件。
                            if (left === 0) {
                                onEnd();
                            }
                        }
                    });
                    active.on("end", () => {
                        // 如果未剩余文件，则表示当前列表已处理完成。
                        if (left === 0) return;
                        for (const file of all) {
                            if (file) {
                                onData(file);
                            }
                        }
                        onEnd();
                    });
                });
            } else {
                this.on("data", onData);
                this.on("end", onEnd);
            }
        } else if ((<{ transform: Function }>processor).transform) {
            // .pipe({...})
            if (active) {
                active.on("end", () => {
                    (<{ transform: Function }>processor).transform(this, result, options);
                });
            } else {
                (<{ transform: Function }>processor).transform(this, result, options);
            }
        } else {
            throw new TypeError("pipe(): Invalid processor");
        }

        return result;
    }

    /**
     * 将所有文件移动到指定的文件夹。
     * @param dir 要保存的目标文件文件夹。如果为空则保存到原文件夹。
     */
    dest(dir?: string | ((file: File) => string)) {
        return this.pipe((file, dir, done) => {
            file.save(typeof dir === "function" ? dir(file) : dir, (error, file) => {
                if (error) {
                    file.error(error);
                }
                done();
            });
        }, dir, false);
    }

    /**
     * 删除所有源文件。
     * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
     */
    delete(deleteDir?: boolean) {
        return this.pipe((file, deleteDir, done) => {
            file.delete(deleteDir, (error, file) => {
                if (error) {
                    file.error(error);
                }
                done();
            });
        }, deleteDir, false);
    }

    /**
     * 筛选当前文件列表并返回一个新的文件列表。
     * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上组合的数组。
     * @returns 返回一个文件列表对象。
     */
    src(...patterns: Pattern[]) {
        return this.pipe({
            transform: (srcList, destList, patterns) => {
                const matcher = new Matcher(patterns);
                srcList.on("data", file => {
                    if (matcher.test(file.path)) {
                        destList.add(file);
                    }
                });
                srcList.on("end", () => destList.end());
            }
        }, patterns, false);
    }

    /**
     * 合并当前列表和指定的列表组成新列表。
     * @param others 要合并的列表或文件。
     * @return 返回一个新文件列表对象。
     */
    concat(...others: (File | FileList)[]) {
        const result = new FileList(this.asyncQueue);
        let pending = 1;
        function addList(list: FileList) {
            pending++;
            list.on("data", file => result.add(file));
            list.on("end", () => {
                if (--pending > 0) return;
                result.end();
            });
        }
        addList(this);
        for (const other of others) {
            if (other instanceof File) {
                result.add(other);
            } else {
                addList(other);
            }
        }
        if (--pending <= 0) {
            result.end();
        }
        return result;
    }

}

/**
 * 表示一个处理器。
 * @param file 要处理的文件。
 * @param options 传递给处理器的只读选项。
 * @param done 如果是异步操作，则用于指示异步操作完成的回调函数。
 * @param srcList 源文件列表。
 * @param destList 目标文件列表。
 */
export type Processor<T> = string | FileList | (((file: File, options: T, done?: () => void, srcList?: FileList, destList?: FileList) => void) | {
    transform(srcList: FileList, destList: FileList, options: T): void;
}) & {
        load?: boolean;
    };

/**
 * 默认配置对象。
 */
const defaultProcessorOptions = Object.freeze({});
