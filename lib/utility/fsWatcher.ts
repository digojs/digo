import { EventEmitter } from "events";
import * as nfs from "fs";
import * as np from "path";
import { inDir } from "./path";

/**
 * 表示一个文件系统监听器。
 * @example
 * var watcher = new FSWatcher();
 * watcher.on("change", function (path) { console.log("Changed", path) });
 * watcher.on("delete", function (path) { console.log("Deleted", path) });
 * watcher.on("create", function (path) { console.log("Created", path) });
 * watcher.add(".", function () { console.log("Start Watching...") });
 */
export class FSWatcher extends EventEmitter {

    // #region 监听事件

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹绝对路径。
     * @return 如果忽略指定的路径则返回 true，否则返回 false。
     */
    ignored(path: string) { return false; }

    /**
     * 当监听到文件删除后执行。
     * @param path 相关的文件绝对路径。
     * @param lastWriteTime 最后修改时间。
     */
    protected onDelete(path: string, lastWriteTime: number) { this.emit("delete", path, lastWriteTime); }

    /**
     * 当监听到文件夹删除后执行。
     * @param path 相关的文件夹绝对路径。
     * @param lastEntries 最后文件列表。
     */
    protected onDeleteDir(path: string, lastEntries: string[]) { this.emit("deleteDir", path, lastEntries); }

    /**
     * 当监听到文件创建后执行。
     * @param path 相关的文件绝对路径。
     * @param stats 文件属性对象。
     */
    protected onCreate(path: string, stats: nfs.Stats) { this.emit("create", path, stats); }

    /**
     * 当监听到文件夹创建后执行。
     * @param path 相关的文件夹绝对路径。
     * @param entries 文件列表。
     */
    protected onCreateDir(path: string, entries: string[]) { this.emit("createDir", path, entries); }

    /**
     * 当监听到文件改变后执行。
     * @param path 相关的文件绝对路径。
     * @param stats 相关的文件属性对象。
     * @param lastWriteTime 最后修改时间。
     */
    protected onChange(path: string, stats: nfs.Stats, lastWriteTime: number) { this.emit("change", path, stats, lastWriteTime); }

    /**
     * 当监听发生错误后执行。
     * @param error 相关的错误对象。
     * @param path 相关的文件绝对路径。
     */
    protected onError(error: NodeJS.ErrnoException, path: string) { this.emit("error", error, path); }

    // #endregion

    // #region 添加和删除

    /**
     * 添加要监听的文件或文件夹。
     * @param path 要添加的文件或文件夹路径。
     * @param callback 开始监听的回调函数。
     */
    add(path: string, callback?: (error: NodeJS.ErrnoException | null, path: string) => void) {
        path = np.resolve(path);
        this._initStats(path, error => {
            if (this.watchOptions.recursive) {
                for (const key in this._watchers) {
                    // 如果已经监听父文件夹，则不重复监听子文件夹。
                    if (inDir(key, path)) {
                        return callback && callback.call(this, null, path);
                    }
                    // 如果已经监听子文件夹，则替换之。
                    if (inDir(path, key)) {
                        this.removeNativeWatcher(key);
                    }
                }
                try {
                    this.createNativeWatcher(path, true);
                } catch (e) {
                    error = e;
                }
            } else {
                if (!(path in this._watchers)) {
                    try {
                        this.createNativeWatcher(path, true);
                    } catch (e) {
                        error = e;
                    }
                }
                for (const key in this._stats) {
                    // 如果子文件夹原来是根监听器，则根监听器改为父监听器。
                    const watcher = this._watchers[key];
                    if (watcher && watcher.root && path !== key && inDir(path, key)) {
                        watcher.root = false;
                    }
                    // 开始监听子文件夹。
                    if (!watcher && typeof this._stats[key] === "object") {
                        try {
                            this.createNativeWatcher(key, false);
                        } catch (e) {
                            error = e;
                        }
                    }
                }
            }
            callback && callback.call(this, error, path);
        });
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
            const watcher = this._watchers[path];
            if (watcher && watcher.root) {
                for (const key in this._watchers) {
                    if (inDir(path, key)) {
                        this.removeNativeWatcher(key);
                    }
                }
            }
        }
    }

    /**
     * 删除所有监听器。
     * @param callback 删除完成后的回调函数。
     */
    close(callback?: () => void) {
        for (const path in this._watchers) {
            this.removeNativeWatcher(path);
        }
        if (this._resolveChangesTimer) {
            clearTimeout(this._resolveChangesTimer);
            delete this._resolveChangesTimer;
        }
        const close = () => {
            this._stats = { __proto__: null! };
            callback && callback();
        };
        if (this._pending) {
            this.once("idle", close);
        } else {
            setImmediate(close);
        }
    }

    /**
     * 判断当前监听器是否正在监听。
     */
    get isWatching() {
        for (const path in this._watchers) {
            return true;
        }
        return false;
    }

    // #endregion

    // #region 底层监听

    /**
     * 存储所有原生监听器对象。
     */
    private _watchers: { [path: string]: NativeFSWatcher; } = { __proto__: null! };

    /**
     * 创建指定路径的原生监听器。
     * @param path 要监听的文件或文件夹绝对路径。
     * @param root 标记当前监听器是否是根监听器。
     * @return 返回原生监听器。
     */
    private createNativeWatcher(path: string, root: boolean) {
        const isFile = typeof this._stats[path] === "number";
        const polling = this.polling != undefined ? this.polling : isFile;
        let watcher: NativeFSWatcher;
        if (polling) {
            const listener = () => {
                this._handleWatchChange("change", path, true);
            };
            nfs.watchFile(path, this.watchOptions, listener);
            watcher = {
                close() {
                    nfs.unwatchFile(path, listener);
                }
            } as NativeFSWatcher;
        } else {
            watcher = nfs.watch(path, this.watchOptions, isFile ? (event: "rename" | "change") => {
                this._handleWatchChange(event, path, true);
            } : (event: "rename" | "change", fileName: string | Buffer) => {
                if (fileName) {
                    this._handleWatchChange(event, np.join(path, fileName instanceof Buffer ? fileName.toString() : fileName), true);
                } else {
                    this._handleWatchChange(event, path, false);
                }
            }).on("error", (error: NodeJS.ErrnoException) => {
                // Windows 下，删除文件夹可能引发 EPERM 错误。
                if (error.code === "EPERM") {
                    return;
                }
                this.onError(error, path);
            }) as NativeFSWatcher;
        }
        watcher.root = root;
        return this._watchers[path] = watcher;
    }

    /**
     * 获取传递给原生监听器的选项。
     */
    watchOptions = {

        /**
         * 是否持久监听。如果设为 false 则在监听到一次改动后立即退出监听。
         */
        persistent: true,

        /**
         * 是否使用原生的递归监听支持。
         */
        recursive: (parseFloat(process.version.slice(1)) > 4 || /^v4\.(?:[5-9]|\d{2,})/.test(process.version)) && (process.platform === "win32" || process.platform === "darwin"),

        /**
         * 默认文件名编码。
         */
        encoding: "buffer",

        /**
         * 轮询的间隔毫秒数。
         */
        interval: 500,

    };

    /**
     * 删除原生监听器。
     * @param path 要删除监听的文件或文件夹绝对路径。
     */
    private removeNativeWatcher(path: string) {
        this._watchers[path].close();
        delete this._watchers[path];
    }

    /**
     * 处理原生监听更改事件。
     * @param event 发生事件的名称。
     * @param path 发生改变的文件或文件夹绝对路径。
     * @param force 是否强制更新所在路径本身。
     */
    private _handleWatchChange(event: "rename" | "change" | "retry", path: string, force: boolean) {
        if (this.ignored(path)) {
            return;
        }
        if (force && typeof this._stats[path] === "number") {
            this._stats[path] = -1;
        }
        if (this._pendingChanges.indexOf(path) < 0) {
            this._pendingChanges.push(path);
        }
        if (!this._resolveChangesTimer) {
            this._resolveChangesTimer = setTimeout(FSWatcher._resolveChanges, this.delay, this);
        }
    }

    /**
     * 监听延时回调的毫秒数。
     * @desc 设置一定的延时可以避免在短时间内重复处理相同的文件。
     */
    delay = 151;

    /**
     * 是否采用轮询的方案。
     */
    polling: boolean | null;

    /**
     * 存储所有已挂起的发生改变的路径。
     */
    private _pendingChanges: string[] = [];

    /**
     * 存储等待解析已挂起的更改的计时器。
     */
    private _resolveChangesTimer: NodeJS.Timer;

    /**
     * 解析所有已挂起的更改文件。
     * @param watcher 目标监听器。
     */
    private static _resolveChanges(watcher: FSWatcher) {
        delete watcher._resolveChangesTimer;
        for (const pendingChange of watcher._pendingChanges) {
            if (typeof watcher._stats[pendingChange] === "object") {
                watcher._updateDirStats(pendingChange);
            } else {
                watcher._updateFileStats(pendingChange);
            }
        }
        watcher._pendingChanges.length = 0;
    }

    /**
     * 存储所有状态对象。
     * @desc
     * 对象的键是绝对路径。
     * 如果路径是一个文件夹，则值为所有直接子文件和子文件夹的名称数组。
     * 如果路径是一个文件，则值为文件的最后修改时间。
     */
    private _stats: { [path: string]: string[] | number } = { __proto__: null! };

    /**
     * 初始化指定文件或文件夹及子文件的状态对象。
     * @param path 要初始化的文件或文件夹绝对路径。
     * @param callback 初始化完成的回调函数。
     * @param stats 当前路径的属性对象。提供此参数可避免重新查询。
     */
    private _initStats(path: string, callback: (error: NodeJS.ErrnoException | null) => void, stats?: nfs.Stats) {
        const oldStats = this._stats[path];
        if (oldStats != undefined) {
            if (typeof oldStats === "object") {
                this._initDirStats(path, callback, oldStats);
            } else {
                callback(null);
            }
        } else if (!stats) {
            this._pending++;
            nfs.stat(path, (error, stats) => {
                if (error) {
                    callback(error);
                } else {
                    this._initStats(path, callback, stats);
                }
                if (--this._pending < 1) {
                    this.emit("idle");
                }
            });
        } else if (stats.isFile()) {
            this._stats[path] = stats.mtime.getTime();
            callback(null);
        } else if (stats.isDirectory()) {
            this._pending++;
            nfs.readdir(path, (error, entries) => {
                if (!error) {
                    this._stats[path] = entries;
                    this._initDirStats(path, callback, entries);
                } else if (error.code === "EMFILE" || error.code === "ENFILE") {
                    this._pending++;
                    setTimeout(() => {
                        this._initStats(path, callback, stats);
                        if (--this._pending < 1) {
                            this.emit("idle");
                        }
                    }, this.delay);
                } else {
                    callback(error);
                }
                if (--this._pending < 1) {
                    this.emit("idle");
                }
            });
        }
    }

    /**
     * 初始化指定文件夹及子文件的状态对象。
     * @param path 要初始化的文件夹绝对路径。
     * @param callback 初始化完成的回调函数。
     * @param entries 当前路文件夹的项。
     */
    private _initDirStats(path: string, callback: (error: NodeJS.ErrnoException | null) => void, entries: string[]) {
        let pending = entries.length;
        if (!pending) {
            callback(null);
        } else {
            let firstError: NodeJS.ErrnoException | null = null;
            for (const entry of entries) {
                const child = np.join(path, entry);
                if (!this.ignored(child)) {
                    this._initStats(child, error => {
                        firstError = firstError || error;
                        if (--pending < 1) {
                            callback(firstError);
                        }
                    });
                } else if (--pending < 1) {
                    callback(firstError);
                }
            }
        }
    }

    /**
     * 正在执行的异步任务数。
     */
    private _pending = 0;

    /**
     * 更新指定文件的状态对象。
     * @param path 要更新的文件绝对路径。
     */
    private _updateFileStats(path: string) {
        this._pending++;
        nfs.stat(path, (error, stats) => {
            if (error) {
                if (error.code === "ENOENT") {
                    this._removeStats(path);
                } else {
                    this.onError(error, path);
                }
            } else if (stats.isFile()) {
                const newMTime = stats.mtime.getTime();
                const prevStats = this._stats[path];
                if (typeof prevStats === "number") {
                    if (prevStats !== newMTime) {
                        this._stats[path] = newMTime;
                        this.onChange(path, stats, prevStats);
                    }
                } else {
                    if (prevStats != undefined) {
                        this._removeStats(path);
                    }
                    this._stats[path] = newMTime;
                    this.onCreate(path, stats);
                }
            } else if (stats.isDirectory()) {
                this._updateDirStats(path);
            }
            if (--this._pending < 1) {
                this.emit("idle");
            }
        });
    }

    /**
     * 更新指定文件夹的状态对象。
     * @param path 要更新的文件夹绝对路径。
     */
    private _updateDirStats(path: string) {
        this._pending++;
        nfs.readdir(path, (error, entries) => {
            if (error) {
                if (error.code === "ENOENT") {
                    this._removeStats(path);
                } else if (error.code === "ENOTDIR" || error.code === "EEXIST") {
                    this._updateFileStats(path);
                } else if (error.code === "EMFILE" || error.code === "ENFILE") {
                    this._handleWatchChange("retry", path, false);
                } else {
                    this.onError(error, path);
                }
            } else {
                if (!this.watchOptions.recursive && !(path in this._watchers) && this.isWatching) {
                    try {
                        this.createNativeWatcher(path, false);
                    } catch (e) {
                        this.onError(e, path);
                    }
                }
                const prevStats = this._stats[path];
                if (typeof prevStats === "object") {
                    for (const entry of prevStats) {
                        if (entries.indexOf(entry) < 0) {
                            this._removeStats(np.join(path, entry));
                        }
                    }
                    this._stats[path] = entries;
                } else {
                    if (prevStats != undefined) {
                        this.onDelete(path, prevStats);
                    }
                    this._stats[path] = entries;
                    this.onCreateDir(path, entries);
                }
                for (const entry of entries) {
                    const child = np.join(path, entry);
                    if (!this.ignored(child)) {
                        const childStats = this._stats[child];
                        if (typeof childStats !== "object") {
                            this._updateFileStats(child);
                        }
                    }
                }
                if (--this._pending < 1) {
                    this.emit("idle");
                }
            }
        });
    }

    /**
     * 删除指定文件或文件夹及子文件的状态对象。
     * @param path 要删除的文件或文件夹绝对路径。
     */
    private _removeStats(path: string) {
        const prevStats = this._stats[path];
        if (prevStats != undefined) {
            delete this._stats[path];
            if (typeof prevStats === "number") {
                this.onDelete(path, prevStats);
            } else {
                const watcher = this._watchers[path];
                if (watcher && !watcher.root) {
                    this.removeNativeWatcher(path);
                }
                for (const entry of prevStats) {
                    this._removeStats(np.join(path, entry));
                }
                this.onDeleteDir(path, prevStats);
            }
        }
    }

    // #endregion

}

export interface FSWatcher {

    /**
     * 绑定一个文件删除事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param path 相关的文件绝对路径。
     * * @param lastWriteTime 最后修改时间。
     */
    on(event: "delete", listener: (path: string, lastWriteTime: number) => void): this;

    /**
     * 绑定一个文件夹删除事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param path 相关的文件夹绝对路径。
     * * @param lastEntries 最后文件列表。
     */
    on(event: "deleteDir", listener: (path: string, lastEntries: string[]) => void): this;

    /**
     * 绑定一个文件创建事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param path 相关的文件绝对路径。
     * * @param stats 文件属性对象。
     */
    on(event: "create", listener: (path: string, stats: nfs.Stats) => void): this;

    /**
     * 绑定一个文件夹删除事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param path 相关的文件夹绝对路径。
     * * @param entries 文件列表。
     */
    on(event: "createDir", listener: (path: string, entries: string[]) => void): this;

    /**
     * 绑定一个文件改变事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param path 相关的文件绝对路径。
     * * @param stats 相关的文件属性对象。
     * * @param lastWriteTime 最后修改时间。
     */
    on(event: "change", listener: (path: string, stats: nfs.Stats, lastWriteTime: number) => void): this;

    /**
     * 绑定一个错误事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param error 相关的错误对象。
     * * @param path 相关的文件绝对路径。
     */
    on(event: "error", listener: (error: NodeJS.ErrnoException, path: string) => void): this;

    /**
     * 绑定一个事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     */
    on(event: string | symbol, listener: Function): this;

}

export default FSWatcher;

/**
 * 表示原生监听器。
 */
interface NativeFSWatcher extends nfs.FSWatcher {

    /**
     * 判断当前监听器是否是顶级监听器。
     */
    root: boolean;

}
