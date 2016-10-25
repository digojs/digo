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
     * 存储当前列表正在等待的直接子列表。
     */
    private activeList: FileList;

    /**
     * 将所有文件传递给目标文件列表或处理器。
     * @param processor 目标文件列表或处理器。
     * @param options 传递给处理器的只读配置对象。
     * @return 返回新的文件列表。
     */
    pipe<T>(processor: string | FileList | SimpleProcessor<T> | Processor<T>, options?: T): FileList {

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

        // .pipe(file => ...): 转为标准处理器。
        let delayLoad: boolean;
        if (typeof processor === "function") {
            delayLoad = true;
            processor = processor.length < 3 ? {
                name: processor.name,
                eachSync: <any>processor
            } : {
                    name: processor.name,
                    each: processor
                };
        }

        // 载入文件内容。
        if (processor.load) {
            return this.pipe({
                each(file, options, done) {
                    file.load((error, file) => {
                        if (error) {
                            file.error(error);
                        }
                        done();
                    });
                }
            }).pipe({
                name: processor.name,
                each: processor.each,
                eachSync: processor.eachSync,
                transform: processor.transform
            }, options);
        }

        // 补齐默认参数。
        if (options === undefined) {
            options = <T>defaultProcessorOptions;
        }

        // 获取等待列表。
        let currentActive = this.activeList;
        if (currentActive) {
            while (currentActive.activeList) {
                currentActive = currentActive.activeList;
            }
        }

        // 创建结果列表。
        const destList = this.activeList = new FileList(this.asyncQueue);

        if (processor.transform) {
            if (currentActive) {
                currentActive.on("end", () => {
                    (<Processor<T>>processor).transform(this, destList, options);
                });
            } else {
                processor.transform(this, destList, options);
            }
        } else {
            let pending = 1; // 需要等待所有 data 事件 + 1 个 end 事件。
            const onData = (file: File) => {
                pending++;
                if (delayLoad) {
                    file.load(onLoad);
                } else {
                    onLoad(null, file);
                }
            };
            const onLoad = (error: NodeJS.ErrnoException, file: File) => {
                if (error) {
                    file.error(error);
                }
                const taskId = (<Processor<T>>processor).name && begin("{default:processor}: {file}", {
                    processor: (<Processor<T>>processor).name,
                    file: file.toString()
                });
                function done() {
                    taskId && end(taskId);
                    destList.add(file);
                    onEnd();
                }
                if ((<Processor<T>>processor).each) {
                    try {
                        (<Processor<T>>processor).each(file, options, done, this, destList);
                    } catch (e) {
                        file.error({
                            plugin: (<Processor<T>>processor).name,
                            error: e
                        });
                        done();
                    }
                } else {
                    if ((<Processor<T>>processor).eachSync) {
                        try {
                            (<Processor<T>>processor).eachSync(file, options, this, destList);
                        } catch (e) {
                            file.error({
                                plugin: (<Processor<T>>processor).name,
                                error: e
                            });
                        }
                    }
                    done();
                }
            }

            const onEnd = () => {
                if (--pending > 0) return;
                destList.end();
            };

            if (currentActive) {
                // a.pipe(A); a.pipe(B) => a.pipe(A).pipe(B); 
                this.on("end", files => {
                    const all = files.slice();
                    let left = all.length;
                    currentActive.on("data", file => {
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
                    currentActive.on("end", () => {
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
        }

        return destList;
    }

    /**
     * 将所有文件移动到指定的文件夹。
     * @param dir 要保存的目标文件文件夹。如果为空则保存到原文件夹。
     */
    dest(dir?: string | ((file: File) => string)) {
        return this.pipe({
            load: false,
            each(file, dir, done) {
                file.save(typeof dir === "function" ? dir(file) : dir, (error, file) => {
                    if (error) {
                        file.error(error);
                    }
                    done();
                });
            }
        }, dir);
    }

    /**
     * 删除所有源文件。
     * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
     */
    delete(deleteDir?: boolean) {
        return this.pipe({
            load: false,
            each(file, deleteDir, done) {
                file.delete(deleteDir, (error, file) => {
                    if (error) {
                        file.error(error);
                    }
                    done();
                });
            }
        }, deleteDir);
    }

    /**
     * 筛选当前文件列表并返回一个新的文件列表。
     * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上组合的数组。
     * @returns 返回一个文件列表对象。
     */
    src(...patterns: Pattern[]) {
        return this.pipe({
            load: false,
            transform: (srcList, destList, patterns) => {
                const matcher = new Matcher(patterns);
                srcList.on("data", file => {
                    if (matcher.test(file.path)) {
                        destList.add(file);
                    }
                });
                srcList.on("end", () => destList.end());
            }
        }, patterns);
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
 * 表示一个简单处理器。
 */
export type SimpleProcessor<T> = (file: File, options: T, done?: () => void, srcList?: FileList, destList?: FileList) => void;

/**
 * 表示一个处理器。
 */
export interface Processor<T> {

    /**
     * 获取当前处理器的名字。
     */
    name?: string;

    /**
     * 判断执行当前处理器前是否需要首先载入文件内容。
     */
    load?: boolean;

    /**
     * 异步处理每个文件。
     * @param file 要处理的文件。
     * @param options 传递给处理器的只读选项。
     * @param done 指示异步操作完成的回调函数。
     * @param srcList 源文件列表。
     * @param destList 目标文件列表。
     */
    each?(file: File, options?: T, done?: () => void, srcList?: FileList, destList?: FileList): void;

    /**
     * 处理每个文件。
     * @param file 要处理的文件。
     * @param options 传递给处理器的只读选项。
     * @param srcList 源文件列表。
     * @param destList 目标文件列表。
     */
    eachSync?(file: File, options?: T, srcList?: FileList, destList?: FileList): void;

    /**
     * 自定义列表转换的逻辑。
     * @param srcList 源文件列表。
     * @param destList 目标文件列表。
     * @param options 传递给处理器的只读选项。
     */
    transform?(srcList: FileList, destList: FileList, options?: T): void;

}

/**
 * 默认配置对象。
 */
const defaultProcessorOptions = Object.freeze({});
