/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import * as fs from "fs";
import * as np from "path";
import { inDir, getDir } from "./path";

/**
 * 表示一个文件系统监听器。
 */
export class FSWatcher {

    // #region 对外接口

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹路径。
     * @returns 如果路径被忽略则返回 true，否则返回 false。
     */
    protected isIgnored(path: string) {
        return /(?:\..*\.sw[px]|\.tmp\~|\.subl\w*\.tmp|~.*\.tmp)$/i.test(path);
    }

    /**
     * 当监听到文件删除后执行。
     * @param paths 相关的路径。
     */
    protected onDelete(paths: string[]) { }

    /**
     * 当监听到文件改变后执行。
     * @param paths 相关的路径。
     * @param stats 文件的属性对象。
     */
    protected onChange(paths: string[], stats: fs.Stats[]) { }

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的路径。
     */
    protected onError(error: NodeJS.ErrnoException, path: string) { throw error; }

    /**
     * 初始化新的监听器。
     * @param options 初始化的选项。
     */
    constructor(options?: FSWatcherOptions) {
        Object.assign(this, options);
    }

    // #endregion

    // #region 添加和删除

    /**
     * 存储所有原生监听器对象。
     */
    private _watchers: { [path: string]: fs.FSWatcher; } = { __proto__: null };

    /**
     * 判断当前监听器是否正在监听。
     */
    get isWatching() {
        for (const path in this._watchers) {
            return true;
        }
        return false;
    }

    /**
     * 添加要监听的文件或文件夹。
     * @param path 要添加的文件或文件夹路径。
     * @param callback 操作完成后的回调函数。
     * @param cache 包含文件夹信息的缓存对象。
     */
    add(path: string, callback?: (error: NodeJS.ErrnoException, path: string) => void, cache?: { [path: string]: number | string[]; }) {
        path = np.resolve(path);
        const cacheReady = (error: NodeJS.ErrnoException) => {
            if (this.watchOptions.recursive) {
                for (const key in this._watchers) {
                    // 如果已经监听的父文件夹，则不重复监听。
                    if (inDir(key, path)) {
                        return callback && callback.call(this, null, path);
                    }
                    // 如果已经监听了子文件夹，则替换之。
                    if (inDir(path, key)) {
                        this.removeNativeWatcher(key);
                    }
                }

                try {
                    this.createNativeWatcher(path, typeof this._fsCache[path] === "number" ? (event) => {
                        this._handleWatchChange(event, path);
                    } : (event, name) => {
                        if (!name) {
                            this._handleWatchChange(event, path);
                        } else {
                            this._handleWatchChange(event, np.join(path, (name instanceof Buffer ? name : Buffer.from(name)).toString()));
                        }
                    });
                } catch (e) {
                    error = e;
                }
            } else {
                for (const key in this._fsCache) {
                    if (!(key in this._watchers) && !(getDir(key) in this._watchers) && inDir(path, key)) {
                        try {
                            this.createNativeWatcher(key, (event) => {
                                this._handleWatchChange(event, key);
                            });
                        } catch (e) {
                            error = e;
                        }
                    }
                }
            }
            callback.call(this, error, path);
        };
        if (cache) {
            Object.assign(this._fsCache, cache);
            cacheReady(null);
        } else {
            this._initCache(path, cacheReady);
        }
        return this;
    }

    /**
     * 删除指定路径的监听器。
     * @param path 要删除的文件或文件夹路径。
     */
    remove(path: string) {
        path = np.resolve(path);
        if (this.watchOptions.recursive) {
            if (path in this._watchers) {
                this.removeNativeWatcher(path);
            }
        } else {
            for (const key in this._watchers) {
                if (inDir(path, key)) {
                    this.removeNativeWatcher(key);
                }
            }
        }
        return this;
    }

    /**
     * 关闭所有监听器。
     */
    close() {
        for (const path in this._watchers) {
            this.removeNativeWatcher(path);
        }
        if (this._emitPendingChangesTimer) {
            clearTimeout(this._emitPendingChangesTimer);
            this._emitPendingChangesTimer = null;
        }

        // 删除所有事件。
        delete this.onChange;
        delete this.onDelete;
        delete this.onError;

        return this;
    }

    /**
     * 传递给原生监听器的选项。
     */
    watchOptions = {

        /**
         * 是否持久监听。如果设为 false 则在监听到一次改动后立即退出监听。
         */
        persistent: true,

        /**
         * 是否使用原生的递归监听支持。
         */
        recursive: parseFloat(process.version.slice(1)) >= 4.5 && (process.platform === "win32" || process.platform === "darwin"),

        /**
         * 默认文件名编码。
         */
        encoding: "buffer",

    };

    /**
     * 创建原生监听器。
     * @param path 要监听的文件或文件夹绝对路径。
     * @param callback 监听回调函数。
     * @return 返回原生监听器。
     */
    private createNativeWatcher(path: string, callback: (event: "rename" | "change", filename: string | Buffer) => void) {
        return this._watchers[path] = fs.watch(path, this.watchOptions, callback).on("error", (error: NodeJS.ErrnoException) => {
            // Windows 下，删除文件夹可能引发 EPERM 错误。
            if (error.code === "EPERM") {
                return;
            }
            this.onError(error, path);
        });
    }

    /**
     * 删除原生监听器。
     * @param path 要删除监听的文件或文件夹绝对路径。
     */
    private removeNativeWatcher(path: string) {
        this._watchers[path].close();
        delete this._watchers[path];
    }

    // #endregion

    // #region 底层监听

    /**
     * 存储所有状态对象缓存。如果值为数组表示是文件夹，为数字表示文件最后修改时间。
     */
    private _fsCache: { [path: string]: string[] | number } = { __proto__: null };

    /**
     * 初始化指定文件或文件夹及子文件的缓存。
     * @param path 要添加的文件或文件夹绝对路径。
     * @param callback 初始化完成的回调函数。
     * @param stats 当前文件的属性。提供此参数可避免重新查询。
     */
    private _initCache(path: string, callback: (error: NodeJS.ErrnoException) => void, stats?: fs.Stats) {
        if (path in this._fsCache) {
            return callback(null);
        }
        if (!stats) {
            fs.stat(path, (error, stats) => {
                if (error) {
                    this.onError(error, path);
                    callback(error);
                } else {
                    this._initCache(path, callback, stats);
                }
            });
        } else if (stats.isFile()) {
            this._fsCache[path] = +stats.mtime;
            callback(null);
        } else if (stats.isDirectory()) {
            fs.readdir(path, (error, entries) => {
                if (error) {
                    if (error.code === "EMFILE" || error.code === "ENFILE") {
                        setTimeout(() => {
                            this._initCache(path, callback, stats);
                        }, this.delay);
                    } else {
                        this.onError(error, path);
                        callback(error);
                    }
                } else {
                    this._fsCache[path] = entries;
                    let pending = entries.length;
                    if (!pending) {
                        callback(null);
                    } else {
                        let firstError = null;
                        for (const entry of entries) {
                            this._initCache(np.join(path, entry), (error: NodeJS.ErrnoException) => {
                                firstError = firstError || error;
                                if (--pending > 0) return;
                                callback(firstError);
                            });
                        }
                    }
                }
            });
        }
    }

    /**
     * 延时回调的毫秒数。
     */
    delay = 107;

    /**
     * 存储所有已挂起的发生改变的路径。
     */
    private _pendingChanges: string[] = [];

    /**
     * 存储等待触发更改事件的计时器。
     */
    private _emitPendingChangesTimer: NodeJS.Timer;

    /**
     * 处理监听更改事件。
     * @param event 发生事件的名称。
     * @param path 发生改变的文件或文件夹绝对路径。
     */
    private _handleWatchChange(event: "rename" | "change" | "retry", path: string) {

        // 应用忽略路径。
        if (this.isIgnored(path)) {
            return;
        }

        // 不重复处理相同路径。
        if (this._pendingChanges.indexOf(path) >= 0) {
            return;
        }
        this._pendingChanges.push(path);

        // 启动计时器。
        if (this._emitPendingChangesTimer) {
            return;
        }
        this._emitPendingChangesTimer = setTimeout(FSWatcher._emitPendingChanges, this.delay, this);
    }

    /**
     * 提交所有已挂起的更改文件的更改事件。
     * @param watcher 目标监听器。
     */
    private static _emitPendingChanges(watcher: FSWatcher) {
        watcher._emitPendingChangesTimer = null;
        for (const pendingChange of watcher._pendingChanges) {
            watcher._updateCache(pendingChange);
        }
        watcher._pendingChanges.length = 0;
    }

    /**
     * 正在更新的文件数。
     */
    private _updatePending = 0;

    /**
     * 存储所有已删除的文件路径。
     */
    private _deletes: string[];

    /**
     * 存储所有已改变的文件路径。
     */
    private _changes: string[];

    /**
     * 存储所有已改变的文件属性。
     */
    private _changeStats: fs.Stats[];

    /**
     * 更新指定的缓存项。
     * @param path 要更新的文件或文件夹路径。
     */
    private _updateCache(path: string) {
        this._updatePending++;
        fs.stat(path, (error, stats) => {
            if (error) {
                if (error.code === "ENOENT") {
                    this._removeCache(path);
                } else {
                    this.onError(error, path);
                }
            } else if (stats.isFile()) {
                const prevCache = this._fsCache[path];
                if (typeof prevCache !== "number" || prevCache !== +stats.mtime) {
                    this._changes = this._changes || [];
                    this._changeStats = this._changeStats || [];
                    if (this._changes.indexOf(path) < 0) {
                        this._changes.push(path);
                        this._changeStats.push(stats);
                    }
                }
                this._fsCache[path] = +stats.mtime;
            } else if (stats.isDirectory()) {
                const prevCache = this._fsCache[path];
                if (typeof prevCache === "number") {
                    this._deletes = this._deletes || [];
                    if (this._deletes.indexOf(path) < 0) {
                        this._deletes.push(path);
                    }
                }
                this._updatePending++;
                fs.readdir(path, (error, entries) => {
                    if (error) {
                        if (error.code === "EMFILE" || error.code === "ENFILE") {
                            this._handleWatchChange("retry", path);
                        }
                    } else {
                        this._fsCache[path] = entries;
                        if (typeof prevCache === "object") {
                            // 查找已删除的路径。
                            for (const entry of prevCache) {
                                if (entries.indexOf(entry) < 0) {
                                    this._removeCache(np.join(path, entry));
                                }
                            }
                            // 查找已新增和更新的路径。
                            for (const entry of entries) {
                                const child = np.join(path, entry);
                                if (typeof this._fsCache[child] !== "object") {
                                    this._updateCache(child);
                                }
                            }
                        } else {
                            for (const entry of entries) {
                                this._updateCache(np.join(path, entry));
                            }
                        }
                    }
                    if (--this._updatePending > 0) return;
                    this._emitChanges();
                });
                if (!this.watchOptions.recursive && !(path in this._watchers)) {
                    try {
                        this.createNativeWatcher(path, (event) => {
                            this._handleWatchChange(event, path);
                        });
                    } catch (e) {
                        this.onError(e, path);
                    }
                }
            }
            if (--this._updatePending > 0) return;
            this._emitChanges();
        });
    }

    /**
     * 删除指定的缓存项。
     * @param path 要删除的文件或文件夹路径。
     */
    private _removeCache(path: string) {
        const prevCache = this._fsCache[path];
        if (typeof prevCache === "number") {
            this._deletes = this._deletes || [];
            this._deletes.push(path);
            delete this._fsCache[path];
        } else if (prevCache) {
            for (const entry of prevCache) {
                this._removeCache(np.join(path, entry));
            }
            delete this._fsCache[path];
        }
    }

    /**
     * 提交更改事件。
     */
    private _emitChanges() {
        if (this._deletes) {
            this.onDelete(this._deletes);
            delete this._deletes;
        }
        if (this._changes) {
            this.onChange(this._changes, this._changeStats);
            delete this._changes;
        }
    }

    // #endregion

}

/**
 * 表示文件系统监听器配置。
 */
export interface FSWatcherOptions {

    /**
     * 延时回调的毫秒数。
     */
    delay?: number;

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹路径。
     * @returns 如果路径被忽略则返回 true，否则返回 false。
     */
    isIgnored?(path: string): boolean;

    /**
     * 当监听到文件改变后执行。
     * @param path 相关的路径。
     * @param stats 文件的属性对象。
     */
    onChange?(paths: string[], stats: fs.Stats[]): void;

    /**
     * 当监听到文件或文件夹删除后执行。
     * @param path 相关的路径。
     */
    onDelete?(paths: string[]): void;

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的路径。
     */
    onError?(error: NodeJS.ErrnoException, path: string);

}
