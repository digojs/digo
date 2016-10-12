/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import * as fs from "fs";
import * as np from "path";
import { inDir } from "./path";

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
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹路径。
     * @returns 如果路径被忽略则返回 true，否则返回 false。
     */
    protected isIgnored(path: string) {
        return /(?:\..*\.sw[px]|\~|\.subl\w*\.tmp|~.*\.tmp)$/i.test(path);
    }

    /**
     * 当监听到一个文件改变后执行。
     * @param path 相关的路径。
     * @param stats 文件的属性对象。
     */
    protected onChange?(path: string, stats: fs.Stats) { }

    /**
     * 当监听到一个文件或文件夹删除后执行。
     * @param path 相关的路径。
     */
    protected onDelete?(path: string) { }

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的路径。
     */
    protected onError?(error: NodeJS.ErrnoException, path: string) { throw error; }

    /**
     * 存储所有原生监听器。
     */
    private watchers: { [path: string]: fs.FSWatcher; } = { __proto__: null };

    /**
     * 判断当前监听器是否正在监听。
     */
    get isWatching() {
        for (const path in this.watchers) {
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
    add(path: string, callback?: (error: NodeJS.ErrnoException, path: string) => void, stats?: fs.Stats, entries?: string[]) {
        path = np.resolve(path);
        if (this.recursive) {
            this.addFast(path, callback, stats);
        } else {
            this.addSlow(path, callback, stats, entries);
        }
        return this;
    }

    /**
     * 底层添加要监听的文件或文件夹，使用原生递归监听。
     * @param path 要添加的文件或文件夹绝对路径。
     * @param callback 操作完成后的回调函数。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     */
    private addFast(path: string, callback?: (error: NodeJS.ErrnoException, path: string) => void, stats?: fs.Stats, watcher?: fs.FSWatcher) {

        // 创建监听器。
        if (!watcher) {
            for (const key in this.watchers) {
                // 如果已经监听的父文件夹，则不重复监听。
                if (inDir(key, path)) {
                    callback && callback.call(this, null, path);
                    return;
                }
                // 如果已经监听了子文件夹，则替换之。
                if (inDir(path, key)) {
                    this.removeNativeWatcher(key);
                }
            }

            try {
                watcher = this.createNativeWatcher(path);
            } catch (e) {
                callback && callback.call(this, e, path);
                return;
            }
        }

        // 获取文件状态。
        if (!stats) {
            return fs.stat(path, (error, stats) => {
                if (error) {
                    this.onError(error, path);
                    return callback && callback.call(this, error, path);
                }
                this.addFast(path, callback, stats, watcher);
            });
        }

        // 添加文件夹和文件监听。
        if (stats.isFile()) {
            watcher.on("change", () => {
                this.notifyChanged(path);
            });
        } else if (stats.isDirectory()) {
            watcher.on("change", (event: "rename" | "change", name?: Buffer | string) => {

                // 如果系统未提供文件名则忽略。
                if (!name) return;

                // 计算实际的文件名。
                name = np.join(path, (name instanceof Buffer ? name : Buffer.from(name)).toString());

                // 应用忽略路径。
                if (this.isIgnored(name)) {
                    return;
                }

                this.notifyChanged(name);
            });
        }
        callback && callback.call(this, null, path);
    }

    /**
     * 底层添加要监听的文件或文件夹，使用模拟递归监听。
     * @param path 要添加的文件或文件夹绝对路径。
     * @param callback 操作完成后的回调函数。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     * @param entries 当前文件夹内的所有项。提供此参数可避免重新查询。
     */
    private addSlow(path: string, callback?: (error: NodeJS.ErrnoException, path: string) => void, stats?: fs.Stats, entries?: string[], watcher?: fs.FSWatcher, changed?: string[], changedStats?: fs.Stats[]) {

        // 创建监听器。
        if (!watcher) {
            if (path in this.watchers) {
                callback && callback.call(this, null, path);
                return;
            }
            try {
                watcher = this.createNativeWatcher(path);
            } catch (e) {
                callback && callback.call(this, e, path);
                return;
            }
        }

        // 获取文件状态。
        if (!stats) {
            return fs.stat(path, (error, stats) => {
                if (error) {
                    this.onError(error, path);
                    return callback && callback.call(this, path, stats);
                }
                this.addSlow(path, callback, stats, entries, watcher, changed, changedStats);
            });
        }

        // 监听文件。
        if (stats.isFile()) {
            watcher.on("change", () => {
                this.notifyChanged(path);
            });
            callback && callback.call(this, null, path);
            return;
        }

        // 监听文件夹。
        if (stats.isDirectory()) {

            // 读取文件列表。
            if (!entries) {
                return fs.readdir(path, (error, entries) => {
                    if (error) {
                        if (error.code === "EMFILE" || error.code === "ENFILE") {
                            return setTimeout(() => {
                                this.addSlow(path, callback, stats, entries, watcher, changed, changedStats);
                            }, this.delay);
                        }
                        this.onError(error, path);
                        return callback && callback.call(this, error, path);
                    }
                    this.addSlow(path, callback, stats, entries, watcher, changed, changedStats);
                });
            }

            const statsCache: { [entry: string]: fs.Stats; } = { __proto__: null };
            let pending = 1;
            const done = () => {
                if (--pending > 0) return;

                // 创建监听器。
                let timer: NodeJS.Timer;
                watcher.on("change", () => {
                    const notifyChanged = () => {
                        timer = null;
                        fs.readdir(path, (error, entries) => {
                            if (error) {
                                if (error.code === "EMFILE" || error.code === "ENFILE") {
                                    return timer = setTimeout(notifyChanged, this.delay);
                                }
                                if (error.code === "ENOENT") {
                                    return this.remove(path);
                                }
                                return this.onError(error, path);
                            }

                            // 如果 entries 丢失了某些项说明文件被删除。
                            let deleted: string[] = [];
                            for (const entry in statsCache) {
                                if (entries.indexOf(entry) < 0) {
                                    const child = np.join(path, entry);
                                    const prevStat = statsCache[entry];
                                    if (prevStat.isDirectory()) {
                                        this.remove(child);
                                    } else if (deleted.indexOf(child) < 0) {
                                        deleted.push(child);
                                    }
                                    delete statsCache[entry];
                                }
                            }

                            // 比较并更新每个文件的状态。
                            let changed: string[] = [];
                            let changedStats: fs.Stats[] = [];
                            let pending = 1;
                            const done = () => {
                                if (--pending > 0) return;
                                for (const name of deleted) {
                                    this.onDelete(name);
                                }
                                for (let i = 0; i < changed.length; i++) {
                                    this.onChange(changed[i], changedStats[i]);
                                }
                            };
                            for (const entry of entries) {
                                const child = np.join(path, entry);
                                if (this.isIgnored(child)) {
                                    continue;
                                }
                                pending++;
                                fs.stat(child, (error, stats) => {
                                    if (error) {
                                        this.onError(error, child);
                                        return done();
                                    }
                                    const prevStat = statsCache[entry];
                                    statsCache[entry] = stats;
                                    if (stats.isFile()) {
                                        if (!prevStat || !prevStat.isFile() || prevStat.mtime < stats.mtime) {
                                            changed.push(child);
                                            changedStats.push(stats);
                                        }
                                    } else if (stats.isDirectory()) {
                                        // 发现新文件夹自动加入监听。
                                        if (!prevStat || !prevStat.isDirectory()) {
                                            return this.addSlow(child, done, stats, undefined, undefined, changed, changedStats);
                                        }
                                    }
                                    done();
                                });
                            }
                            done();
                        });
                    };
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(notifyChanged, this.delay);
                });

                callback && callback.call(this, null, path);
            };

            // 收集子文件和文件夹的状态。
            for (const entry of entries) {
                const child = np.join(path, entry);
                if (this.isIgnored(child)) {
                    continue;
                }
                pending++;
                fs.stat(child, (error, stats) => {
                    if (error) {
                        this.onError(error, child);
                        return done();
                    }
                    statsCache[entry] = stats;
                    if (stats.isDirectory()) {
                        this.addSlow(child, done, stats, undefined, undefined, changed, changedStats);
                    } else {
                        // 监听时如果发现新增了文件夹，则自动将文件夹加入监听。
                        // 新增文件夹时，当前文件夹里的所有文件都被认为是新增的。
                        if (changed) {
                            changed.push(child);
                            changedStats.push(stats);
                        }
                        done();
                    }
                });
            }
            return done();
        }

        callback && callback.call(this, null, path);

    }

    /**
     * 创建原生监听器。
     * @param path 要监听的文件或文件夹绝对路径。
     * @return 返回原生监听器。
     */
    private createNativeWatcher(path: string) {
        return this.watchers[path] = fs.watch(path, this).on("error", (error: NodeJS.ErrnoException) => {
            // Windows 下，删除文件夹可能引发 EPERM 错误。
            if (error.code === "EPERM") {
                return;
            }
            this.onError(error, path);
        });
    }

    /**
     * 删除指定路径的监听器。
     * @param path 要删除的文件或文件夹路径。
     */
    remove(path: string) {
        path = np.resolve(path);
        if (this.recursive) {
            if (path in this.watchers) {
                this.removeNativeWatcher(path);
            }
        } else {
            for (const key in this.watchers) {
                if (inDir(path, key)) {
                    this.removeNativeWatcher(key);
                }
            }
        }
        return this;
    }

    /**
     * 删除原生监听器。
     * @param path 要删除监听的文件或文件夹绝对路径。
     */
    private removeNativeWatcher(path: string) {
        this.watchers[path].close();
        delete this.watchers[path];
    }

    /**
     * 关闭所有监听器。
     */
    close() {
        for (const path in this.watchers) {
            this.removeNativeWatcher(path);
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
     * 存储所有已更改的路径。
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
    delay = 107;

    /**
     * 通知指定的路径已更改。
     * @param path 发生改变的文件或文件夹绝对路径。
     */
    private notifyChanged(path: string) {

        // 如果文件已标记为更改，则不作处理。
        if (this._pendingChanges.indexOf(path) >= 0) {
            return;
        }
        this._pendingChanges.push(path);

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
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹路径。
     * @returns 如果路径被忽略则返回 true，否则返回 false。
     */
    isIgnored?(path: string);

    /**
     * 当监听到一个文件改变后执行。
     * @param path 相关的路径。
     * @param stats 文件的属性对象。
     */
    onChange?(path: string, stats: fs.Stats);

    /**
     * 当监听到一个文件或文件夹删除后执行。
     * @param path 相关的路径。
     */
    onDelete?(path: string);

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的路径。
     */
    onError?(error: NodeJS.ErrnoException, path: string);

}
