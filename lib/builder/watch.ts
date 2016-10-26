/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import { formatDate } from "../utility/date";
import { FSWatcher, FSWatcherOptions } from "../utility/watcher";
import { LogEntry, info, error, getDisplayName } from "./logging";
import { then } from "./then";
import file = require("./file");
import logging = require("./logging");
import progress = require("./progress");

/**
 * 表示一个监听器。
 */
export class Watcher extends FSWatcher {

    /**
     * 获取当前监听器默认执行的任务名。
     */
    task: () => void;

    /**
     * 存储所有模块的依赖关系。
     */
    deps: { [path: string]: string[] } = { __proto__: null };

    /**
     * 当前待处理的文件列表。
     */
    changedFiles: string[];

    /**
     * 获取当前生成的次数。
     */
    version = 0;

    /**
     * 初始化新的监听器。
     * @param task 默认执行的任务名。
     * @param options 初始化的选项。
     */
    constructor(task: () => void, options?: FSWatcherOptions) {
        super(options);
        this.task = task;
    }

    /**
     * 当监听到文件改变后执行。
     * @param paths 相关的路径。
     * @param stats 文件的属性对象。
     */
    protected onChange(paths: string[]) {

        then(() => {
            this.clear();

            // FIXME: 支持 windows 下路径不区分大小写?
            const addDep = (path: string) => {
                for (const key in this.deps) {
                    if (this.deps[key].indexOf(path) >= 0) {
                        if (paths.indexOf(key) >= 0) continue;
                        paths.push(key);
                        addDep(key);
                    }
                }
            };

            // 依赖当前文件的模块也必须重新打包。
            for (let i = 0; i < paths.length; i++) {
                addDep(paths[i]);
            }
            this.changedFiles = paths;
            this.task();
            then(() => {
                delete this.changedFiles;
                info(paths.length < 2 ? "{gray:now} {cyan:Changed}: {file}" : "{gray:now} {cyan:Changed}: {file} (+{hidden} hidden files)", {
                    now: formatDate(undefined, "[HH:mm:ss]"),
                    file: getDisplayName(paths[0]),
                    hidden: paths.length - 1
                });
            });
        });
    }

    /**
     * 当监听到文件或文件夹删除后执行。
     * @param paths 相关的路径。
     */
    protected onDelete(paths: string[]) {
        then(() => {
            this.clear();
            this.changedFiles = paths;
            const oldWorkingMode = file.workingMode;
            file.workingMode = file.WorkingMode.clean;
            this.task();
            then(() => {
                file.workingMode = oldWorkingMode;
                delete this.changedFiles;
                info(paths.length < 2 ? "{gray:now} {cyan:Deleted}: {file}" : "{gray:now} {cyan:Deleted}: {file} (+{hidden} hidden files)", {
                    now: formatDate(undefined, "[HH:mm:ss]"),
                    file: getDisplayName(paths[0])
                });
            });
        });
    }

    /**
     * 清理生成器的状态。
     */
    private clear() {
        this.version++;
        file.fileCount = logging.errorCount = logging.warningCount = 0;
        progress.taskCount = progress.doneTaskCount = 0;
    }

    /**
     * 当发生错误后执行。
     * @param e 相关的错误对象。
     */
    protected onError(e: NodeJS.ErrnoException) {
        error(e);
    }

}

/**
 * 获取或设置当前使用的监听器。
 */
export var watcher: Watcher = null;

/**
 * 以监听方式执行一个任务。
 * @param task 要执行的任务函数。
 * @param options 监听的选项。
 */
export function watch(task: () => void, options?: FSWatcherOptions) {
    if (watcher) {
        watcher.close();
    }
    watcher = new Watcher(task, options);
    task();
    return watcher;
}
