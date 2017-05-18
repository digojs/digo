import * as nfs from "fs";
import { formatDate } from "../utility/lang";
import { FSWatcher } from "../utility/fsWatcher";
import { Matcher, Pattern } from "../utility/matcher";
import { AsyncCallback } from "../utility/asyncQueue";
import { asyncQueue, then } from "./async";
import { off, on } from "./events";
import { error, getDisplayName, info } from "./logging";
import { globalMatcher, RootFileList } from "./src";
import file = require("./file");
import logging = require("./logging");
import progress = require("./progress");

/**
 * 表示一个监听器。
 */
export class Watcher extends FSWatcher {

    /**
     * 判断是否忽略指定的路径。
     * @param path 要判断的文件或文件夹绝对路径。
     * @return 如果应忽略指定的路径则返回 true，否则返回 false。
     */
    ignored(path: string) { return !globalMatcher.test(path); }

    /**
     * 当监听到文件删除后执行。
     * @param path 相关的文件绝对路径。
     * @param lastWriteTime 最后修改时间。
     */
    protected onDelete(path: string, lastWriteTime: number) {
        this.addDelete(path);
        const changedFileCount = this.changed.length + this.deleted.length;
        info(changedFileCount > 1 ? "{brightBlack:now} {brightCyan:Deleted}: {bright:file}{brightBlack:(+}{brightBlack:hidden}{brightBlack:)}" : "{brightBlack:now} {brightCyan:Deleted}: {bright:file}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            file: getDisplayName(path),
            hidden: changedFileCount - 1
        });
        this.rebuild();
        super.onDelete(path, lastWriteTime);
    }

    /**
     * 当监听到文件创建后执行。
     * @param path 相关的文件绝对路径。
     * @param stats 文件属性对象。
     */
    protected onCreate(path: string, stats: nfs.Stats) {
        this.addChange(path);
        const changedFileCount = this.changed.length + this.deleted.length;
        info(changedFileCount > 1 ? "{brightBlack:now} {brightCyan:Created}: {bright:file}{brightBlack:(+}{brightBlack:hidden}{brightBlack:)}" : "{brightBlack:now} {brightCyan:Created}: {bright:file}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            file: getDisplayName(path),
            hidden: changedFileCount - 1
        });
        this.rebuild();
        super.onCreate(path, stats);
    }

    /**
     * 当监听到文件改变后执行。
     * @param path 相关的文件绝对路径。
     * @param stats 相关的文件属性对象。
     * @param lastWriteTime 最后修改时间。
     */
    protected onChange(path: string, stats: nfs.Stats, lastWriteTime: number) {
        this.addChange(path);
        const changedFileCount = this.changed.length + this.deleted.length;
        info(changedFileCount > 1 ? "{brightBlack:now} {brightCyan:Changed}: {bright:file}(+{hidden})" : "{brightBlack:now} {brightCyan:Changed}: {bright:file}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            file: getDisplayName(path),
            hidden: changedFileCount - 1
        });
        this.rebuild();
        super.onChange(path, stats, lastWriteTime);
    }

    /**
     * 当监听发生错误后执行。
     * @param e 相关的错误对象。
     * @param path 相关的文件绝对路径。
     */
    protected onError(e: NodeJS.ErrnoException, path: string) {
        error(e);
    }

    /**
     * 缓存所有已更新的文件。
     */
    private changed: string[] = [];

    /**
     * 缓存所有已删除的文件。
     */
    private deleted: string[] = [];

    /**
     * 存储所有模块的依赖关系。
     */
    private deps: { [path: string]: string[] } = { __proto__: null! };

    /**
     * 添加一个已更新的文件。
     * @param path 已更新的文件绝对路径。
     */
    private addChange(path: string) {
        if (this.changed.indexOf(path) >= 0) {
            return;
        }
        if (this.deleted.indexOf(path) >= 0) {
            this.deleted.splice(this.deleted.indexOf(path), 1);
        }
        this.changed.push(path);
        for (const key in this.deps) {
            if (this.deps[key].indexOf(path) >= 0) {
                this.addChange(key);
            }
        }
    }

    /**
     * 添加一个已删除的文件。
     * @param path 已删除的文件绝对路径。
     */
    private addDelete(path: string) {
        if (this.deleted.indexOf(path) >= 0) {
            return;
        }
        if (this.changed.indexOf(path) >= 0) {
            this.changed.splice(this.changed.indexOf(path), 1);
        }
        this.deleted.push(path);
        for (const key in this.deps) {
            if (this.deps[key].indexOf(path) >= 0) {
                this.addChange(key);
            }
        }
    }

    /**
     * 重新构建发生改变的文件。
     */
    private rebuild() {
        then(() => {
            this.reset();
            this.emit("rebuild", this.changed, this.deleted);
            for (const list of this.rootLists) {
                let added = false;
                for (const p of this.deleted) {
                    if (list.matcher.test(p)) {
                        added = true;
                        const f = list.createFile(p);
                        if (f.buildMode !== file.BuildMode.preview) {
                            f.buildMode = file.BuildMode.clean;
                            list.add(f);
                        }
                    }
                }
                for (const p of this.changed) {
                    if (list.matcher.test(p)) {
                        added = true;
                        list.add(list.createFile(p));
                    }
                }
                if (added) {
                    list.end();
                }
            }
            this.deleted.length = this.changed.length = 0;
        });
    }

    /**
     * 清理生成器的状态。
     */
    private reset() {
        file.fileCount = logging.errorCount = logging.warningCount = 0;
        progress.taskCount = progress.doneTaskCount = 0;
    }

    /**
     * 获取所有根节点列表。
     */
    readonly rootLists: RootFileList[] = [];

    /**
     * 判断当前监听器是否已初始化。
     */
    inited = false;

    /**
     * 执行并开始监听指定的任务。
     * @param task 执行的任务名。
     * @param callback 开始监听的回调。
     */
    start(task: AsyncCallback, callback?: () => void) {
        const addList = (value: RootFileList) => {
            if (value.matcher.patterns.length || value.matcher.ignoreMatcher) {
                this.rootLists.push(value);
            }
        };
        const addFile = (path: string, stats: nfs.Stats) => {
            (this as any)._stats[path] = stats.mtime.getTime();
        };
        const addDir = (path: string, stats: nfs.Stats, entries: string) => {
            (this as any)._stats[path] = entries;
        };

        on("addList", addList);
        on("addFile", addFile);
        on("addDir", addDir);
        on("fileDep", this.addDep = this.addDep.bind(this));

        then(task);

        then(() => {
            off("addList", addList);
            off("addFile", addFile);
            off("addDir", addDir);
            for (const list of this.rootLists) {
                addWatch(this, list.matcher);
            }
            for (const path in this.deps) {
                this.add(path);
                for (const dep of this.deps[path]) {
                    if (!(dep in this.deps)) {
                        this.add(dep);
                    }
                }
            }
            this.inited = true;
            callback && callback();
        });
    }

    /**
     * 添加文件的依赖项。
     * @param file 相关的文件。
     * @param dep 依赖的绝对路径。
     */
    addDep(file: file.File, path: string) {
        if (file.initialPath) {
            let deps = this.deps[file.initialPath];
            if (!deps) {
                deps = this.deps[file.initialPath] = [];
                this.inited && this.add(file.initialPath);
            }
            if (deps.indexOf(path) < 0) {
                deps.push(path);
                this.inited && this.add(path);
            }
        }
    }

    /**
     * 删除所有监听器。
     * @param callback 删除完成后的回调函数。
     */
    close(callback?: () => void) {
        this.inited = false;
        off("fileDep", this.addDep);
        super.close(callback);
    }

}

export interface Watcher {

    /**
     * 绑定一个重新生成事件。
     * @param changes 所有已更新需要重新生成的文件。
     * @param deletes 所有已删除需要重新生成的文件。
     */
    on(event: "rebuild", listener: (changes: string[], deletes: string[]) => void): this;

    /**
     * 绑定一个文件删除事件。
     * @param path 相关的文件绝对路径。
     * @param lastWriteTime 最后修改时间。
     */
    on(event: "delete", listener: (path: string, lastWriteTime: number) => void): this;

    /**
     * 绑定一个文件夹删除事件。
     * @param path 相关的文件夹绝对路径。
     * @param lastEntries 最后文件列表。
     */
    on(event: "deleteDir", listener: (path: string, lastEntries: string[]) => void): this;

    /**
     * 绑定一个文件创建事件。
     * @param path 相关的文件绝对路径。
     * @param stats 文件属性对象。
     */
    on(event: "create", listener: (path: string, stats: nfs.Stats) => void): this;

    /**
     * 绑定一个文件夹删除事件。
     * @param path 相关的文件夹绝对路径。
     * @param entries 文件列表。
     */
    on(event: "createDir", listener: (path: string, entries: string[]) => void): this;

    /**
     * 绑定一个文件改变事件。
     * @param path 相关的文件绝对路径。
     * @param stats 相关的文件属性对象。
     * @param lastWriteTime 最后修改时间。
     */
    on(event: "change", listener: (path: string, stats: nfs.Stats, lastWriteTime: number) => void): this;

    /**
     * 绑定一个错误事件。
     * @param error 相关的错误对象。
     * @param path 相关的文件绝对路径。
     */
    on(event: "error", listener: (error: NodeJS.ErrnoException, path: string) => void): this;

    /**
     * 绑定一个事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     */
    on(event: string | symbol, listener: Function): this;

}

/**
 * 是否采用轮询监听的方式。
 */
export var polling = null;

/**
 * 当前使用的监听器。
 */
export var watcher: Watcher | null = null;

/**
 * 监听指定的文件并执行回调。
 * @param pattern 要监听的文件匹配器。匹配器可以是通配符、正则表达式、函数或以上组合的数组。
 * @param listener 要执行的任务函数。
 */
export function watch(pattern: Pattern, listener: (event: "create" | "change" | "delete", path: string) => void): FSWatcher;

/**
 * 执行指定的任务并监听所有生成的文件。
 * @param task 要执行的任务函数。
 */
export function watch(task: AsyncCallback): Watcher;

export function watch(pattern: Pattern | AsyncCallback, listener?: (event: "create" | "change" | "delete", path: string) => void) {
    if (typeof listener === "function") {
        const result = new FSWatcher();
        result.polling = polling;
        const matcher = new Matcher(pattern as Pattern);
        result.ignored = path => {
            if (matcher.ignoreMatcher && matcher.ignoreMatcher.test(path)) {
                return true;
            }
            return !globalMatcher.test(path);
        };
        result.on("delete", path => { listener("delete", path); });
        result.on("change", path => { listener("change", path); });
        result.on("create", path => { listener("create", path); });
        result.on("error", error);
        addWatch(result, matcher);
        return result;
    }
    if (watcher) {
        watcher.close();
    }
    watcher = new Watcher();
    watcher.polling = polling;
    watcher.start(pattern as AsyncCallback);
    return watcher;
}

/**
 * 添加指定匹配器符合的文件夹。
 * @param watcher 要添加的监听器。
 * @param matcher 要添加的匹配器。
 */
function addWatch(watcher: FSWatcher, matcher: Matcher) {
    for (const pattern of (matcher.patterns.length ? matcher.patterns : [{
        base: process.cwd()
    }])) {
        asyncQueue.lock("addWatch:" + pattern.base);
        watcher.add(pattern.base, () => {
            asyncQueue.unlock("addWatch:" + pattern.base);
        });
    }
}
