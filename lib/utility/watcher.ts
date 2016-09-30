/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import * as p from "path";
import * as fs from "fs";
import { relativePath, inDir } from "./path";

/**
 * 表示一个文件系统监听器。
 */
export class FSWatcher {

    /**
     * 获取或设置是否持久监听。如果设为 false 则在监听到一次改动后立即退出监听。
     */
    persistent = true;

    /**
     * 获取或设置是否使用原生的递归监听支持。
     */
    recursive = parseFloat(process.version.slice(1)) >= 4.5 && (process.platform === "win32" || process.platform === "darwin");

    /**
     * 获取或设置默认文件名编码。
     */
    encoding = "buffer";

    /**
     * 判断是否忽略指定的名称。
     * @param name 要判断的文件或文件夹名称。
     * @returns 如果名称被忽略则返回 true，否则返回 false。
     */
    protected isIgnored(name: string) {
        return /\..*\.(sw[px])$|\~$|\.subl\w*\.tmp|~.*\.tmp/i.test(name);
    }

    /**
     * 当监听到一个文件改变后执行。
     * @param name 相关的名称。
     * @param stats 文件的属性对象。
     */
    protected onChange(name: string, stats: fs.Stats) { }

    /**
     * 当监听到一个文件或文件夹删除后执行。
     * @param name 相关的名称。
     */
    protected onDelete(name: string) { }

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     */
    protected onError(error: NodeJS.ErrnoException) { throw error; }

    /**
     * 存储所有原生监听器。
     */
    private watchers: { [name: string]: fs.FSWatcher; } = { __proto__: null };

    /**
     * 判断当前监听器是否正在监听。
     */
    get isWatching() {
        for (const name in this.watchers) {
            return true;
        }
        return false;
    }

    /**
     * 初始化新的监听器。
     * @param options 初始化的选项。
     */
    constructor(options?: FSWatcherOptions) {
        Object.assign(this, options);
    }

    /**
     * 添加要监听的文件或文件夹。
     * @param path 要添加的文件或文件夹路径。
     * @param callback 操作完成后的回调函数。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     * @param entries 当前文件夹内的所有项。提供此参数可避免重新查询。
     */
    add(path: string, callback?: (name: string) => void, stats?: fs.Stats, entries?: string[]) {
        path = relativePath(path);
        if (this.recursive) {
            this.addFast(path, callback, stats);
        } else {
            this.addSlow(path, callback, stats, entries);
        }
        return this;
    }

    /**
     * 底层添加要监听的文件或文件夹，使用原生递归监听。
     * @param name 要添加的文件或文件夹名称。
     * @param callback 操作完成后的回调函数。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     */
    private addFast(name: string, callback?: (name: string) => void, stats?: fs.Stats, watcher?: fs.FSWatcher) {

        // 创建监听器。
        if (!watcher) {
            for (const key in this.watchers) {
                // 如果已经监听的父文件夹，则不重复监听。
                if (inDir(key, name)) {
                    return callback && callback.call(this, name);
                }
                // 如果已经监听了子文件夹，则替换之。
                if (inDir(name, key)) {
                    this.removeNativeWatcher(key);
                    break;
                }
            }
            watcher = this.createNativeWatcher(name);
        }

        // 获取文件状态。
        if (!stats) {
            return fs.stat(name, (error, stats) => {
                if (error) {
                    this.onError(error);
                    return callback && callback.call(this, name);
                }
                this.addFast(name, callback, stats, watcher);
            });
        }

        // 添加文件夹和文件监听。
        if (stats.isFile()) {
            watcher.on("change", () => {
                this.notifyChanged(name);
            });
        } else if (stats.isDirectory()) {
            watcher.on("change", (event: "rename" | "change", fileName?: Buffer | string) => {

                // 如果系统未提供文件名则忽略。
                if (!fileName) return;

                // 计算实际的文件名。
                fileName = (fileName instanceof Buffer ? fileName : Buffer.from(fileName)).toString();
                if (p.sep === "\\") fileName = fileName.replace(/\\/g, "/");
                if (name !== ".") {
                    fileName = name === "/" ? name + fileName : name + "/" + fileName;
                }

                // 应用忽略路径。
                if (this.isIgnored(fileName)) {
                    return;
                }

                this.notifyChanged(fileName);
            });
        }
        callback && callback.call(this, name);
    }

    /**
     * 底层添加要监听的文件或文件夹，使用模拟递归监听。
     * @param name 要添加的文件或文件夹名称。
     * @param callback 操作完成后的回调函数。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     * @param entries 当前文件夹内的所有项。提供此参数可避免重新查询。
     */
    private addSlow(name: string, callback?: (name: string, stats?: fs.Stats) => void, stats?: fs.Stats, entries?: string[], watcher?: fs.FSWatcher, files?: { [name: string]: fs.Stats; }) {

        // 创建监听器。
        if (!watcher) {
            if (name in this.watchers) {
                return;
            }
            watcher = this.createNativeWatcher(name);
        }

        // 获取文件状态。
        if (!stats) {
            return fs.stat(name, (error, stats) => {
                if (error) {
                    this.onError(error);
                    return callback && callback.call(this, name, stats);
                }
                this.addSlow(name, callback, stats, entries, watcher, files);
            });
        }

        // 监听文件。
        if (stats.isFile()) {
            watcher.on("change", () => {
                this.notifyChanged(name);
            });
            callback && callback.call(this, name, stats);
            return;
        }

        // 监听文件夹。
        if (stats.isDirectory()) {

            // 读取文件列表。
            if (!entries) {
                return fs.readdir(name, (error, entries) => {
                    if (error) {
                        if (error.code === "EMFILE" || error.code === "ENFILE") {
                            setTimeout(() => {
                                this.addSlow(name, callback, stats, entries, watcher, files);
                            }, this.delay);
                        }
                        this.onError(error);
                        return callback && callback.call(this, name, stats);
                    }
                    this.addSlow(name, callback, stats, entries, watcher, files);
                });
            }

            const statsCache: { [name: string]: fs.Stats; } = { __proto__: null };
            let count = entries.length;
            const eachCallback = () => {
                if (--count > 0) return;

                // 创建监听器。
                let timer: NodeJS.Timer;
                watcher.on("change", () => {
                    const notifyChanged = () => {
                        timer = null;
                        fs.readdir(name, (error, entries) => {
                            if (error) {
                                if (error.code === "EMFILE" || error.code === "ENFILE") {
                                    return timer = setTimeout(notifyChanged, this.delay);
                                }
                                if (error.code === "ENOENT") {
                                    return this.remove(name);
                                }
                                return this.onError(error);
                            }

                            // 如果 newEntries 丢失了某些项说明文件被删除。
                            let deletes: string[] = [];
                            for (const entry in statsCache) {
                                if (entries.indexOf(entry) < 0) {
                                    const child = name === "." ? entry : name === "/" ? name + entry : name + "/" + entry;
                                    const prevStat = statsCache[entry];
                                    if (prevStat.isDirectory()) {
                                        this.remove(child);
                                    } else if (deletes.indexOf(child) < 0) {
                                        deletes.push(child);
                                    }
                                    delete statsCache[entry];
                                }
                            }

                            // 比较并更新每个文件的状态。
                            let count = entries.length;
                            let changes: { [name: string]: fs.Stats; } = { __proto__: null };
                            const eachCallback = () => {
                                if (--count > 0) return;
                                for (const name of deletes) {
                                    this.onDelete(name);
                                }
                                for (const name in changes) {
                                    this.onChange(name, changes[name]);
                                }
                            };
                            if (count) {
                                for (const entry of entries) {
                                    const child = name === "." ? entry : name === "/" ? name + entry : name + "/" + entry;
                                    fs.stat(child, (error, stats) => {
                                        if (error) {
                                            this.onError(error);
                                            return eachCallback();
                                        }
                                        const prevStat = statsCache[entry];
                                        statsCache[entry] = stats;
                                        // 发现新文件夹自动加入监听。
                                        if (stats.isDirectory()) {
                                            if (!prevStat || !prevStat.isDirectory()) {
                                                return this.addSlow(child, eachCallback, stats, undefined, undefined, changes);
                                            }
                                        } else if (stats.isFile() && (!prevStat || !prevStat.isFile() || prevStat.mtime < stats.mtime)) {
                                            changes[child] = stats;
                                        }
                                        eachCallback();
                                    });
                                }
                            } else {
                                eachCallback();
                            }
                        });
                    };
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(notifyChanged, this.delay);
                });

                callback && callback.call(this, name, stats);
            };

            // 收集子文件和文件夹的状态。
            if (count) {
                for (const entry of entries) {
                    const child = name === "." ? entry : name === "/" ? name + entry : name + "/" + entry;
                    if (this.isIgnored(child)) {
                        eachCallback();
                        continue;
                    }
                    fs.stat(child, (error, stats) => {
                        if (error) {
                            this.onError(error);
                            eachCallback();
                            return;
                        }
                        statsCache[entry] = stats;
                        if (stats.isDirectory()) {
                            this.addSlow(child, eachCallback, stats, undefined, undefined, files);
                        } else {
                            if (files && stats.isFile()) {
                                files[child] = stats;
                            }
                            eachCallback();
                        }
                    });
                }
            } else {
                eachCallback();
            }
            return;

        }

        callback && callback.call(this, name, stats);

    }

    /**
     * 创建原生监听器。
     * @param name 要监听的文件或文件夹名称。
     * @return 返回原生监听器。
     */
    private createNativeWatcher(name: string) {
        try {
            var watcher = this.watchers[name] = fs.watch(name, this);
        } catch (e) {
            this.onError(e);
            return null;
        }
        watcher.on("error", (error: NodeJS.ErrnoException) => {
            // Windows 下，删除文件夹可能引发 EPERM 错误。
            if (error.code === "EPERM") {
                return;
            }
            this.onError(error);
        });
        return watcher;
    }

    /**
     * 删除指定路径的监听器。
     * @param path 要删除的文件或文件夹路径。
     */
    remove(path: string) {
        path = relativePath(path);
        if (this.recursive) {
            if (path in this.watchers) {
                this.removeNativeWatcher(path);
            }
        } else {
            for (const name in this.watchers) {
                if (inDir(path, name)) {
                    this.removeNativeWatcher(name);
                }
            }
        }
        return this;
    }

    /**
     * 删除原生监听器。
     * @param name 要删除监听的文件或文件夹名称。
     */
    private removeNativeWatcher(name: string) {
        this.watchers[name].close();
        delete this.watchers[name];
    }

    /**
     * 关闭所有监听器。
     */
    close() {
        for (const name in this.watchers) {
            this.removeNativeWatcher(name);
        }
        if (this._emitChangesTimer) {
            clearTimeout(this._emitChangesTimer);
            this._emitChangesTimer = null;
        }

        // 删除所有事件。
        delete this.onChange;
        delete this.onDelete;
        delete this.onError;

        return this;
    }

    /**
     * 存储所有已更改的名称。
     * @remark
     * 为避免重复触发同一个文件的更改事件。
     * 每次回调函数都会在此进行暂时存储。
     */
    private _pendingChanges: string[] = [];

    /**
     * 等待触发更改事件的计时器。
     */
    private _emitChangesTimer: NodeJS.Timer;

    /**
     * 延时回调的毫秒数。
     */
    delay = 57;

    /**
     * 通知指定的路径已更改。
     * @param name 发生改变的文件或文件夹名称。
     */
    private notifyChanged(name: string) {

        // 如果文件已标记为更改，则不作处理。
        if (this._pendingChanges.indexOf(name) >= 0) {
            return;
        }
        this._pendingChanges.push(name);

        // 重新开始计时。
        if (this._emitChangesTimer) {
            return;
        }
        this._emitChangesTimer = setTimeout(FSWatcher.emitChanges, this.delay, this);
    }

    /**
     * 提交所有被更改文件的更改事件。
     * @param watcher 目标监听器。
     */
    private static emitChanges(watcher: FSWatcher) {
        watcher._emitChangesTimer = null;
        for (const path of watcher._pendingChanges) {
            fs.stat(path, (error, stats) => {
                if (error) {
                    if (error.code === "ENOENT") {
                        watcher.onDelete(path);
                    }
                } else if (stats.isFile()) {
                    watcher.onChange(path, stats);
                }
            });
        }
        watcher._pendingChanges.length = 0;
    }

}

/**
 * 表示文件系统监听器配置。
 */
export interface FSWatcherOptions {

    /**
     * 是否持久监听。如果设为 false 则在监听到一次改动后立即退出监听。
     */
    persistent?: boolean;

    /**
     * 是否使用原生的递归监听支持。
     */
    recursive?: false;

    /**
     * 默认文件名编码。
     */
    encoding?: string;

    /**
     * 延时回调的毫秒数。
     */
    delay?: number;

    /**
     * 判断是否忽略指定的名称的回调函数。
     * @param name 要判断的文件或文件夹名称。
     * @returns 如果名称被忽略则返回 true，否则返回 false。
     */
    isIgnored?(name: string);

    /**
     * 当监听到一个文件改变后的回调函数。
     * @param name 相关的名称。
     * @param stats 文件的属性对象。
     */
    onChange?(name: string, stats: fs.Stats);

    /**
     * 监听到一个文件或文件夹删除后的回调函数。
     * @param name 相关的名称。
     */
    onDelete?(name: string);

    /**
     * 发生错误后执行的回调函数。
     * @param error 相关的错误对象。
     */
    onError?(error: NodeJS.ErrnoException);

}
