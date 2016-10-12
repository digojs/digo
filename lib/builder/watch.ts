/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import { formatDate } from "../utility/date";
import { FSWatcher, FSWatcherOptions } from "../utility/watcher";
import { LogEntry, info, getDisplayName } from "./logging";
import file = require("./file");
import logging = require("./logging");
import then = require("./then");

/**
 * 表示一个监听器。
 */
export class Watcher extends FSWatcher {

    /**
     * 获取当前监听器默认执行的任务名。
     */
    task: Function;

    /**
     * 存储所有模块的依赖关系。
     */
    deps: { [path: string]: string[] } = { __proto__: null };

    /**
     * 当前待处理的文件列表。
     */
    changedFiles: string[] = [];

    /**
     * 初始化新的监听器。
     * @param task 默认执行的任务名。
     * @param options 初始化的选项。
     */
    constructor(task: Function, options?: FSWatcherOptions) {
        super(options);
        this.task = task;
    }

    /**
     * 当监听到一个文件改变后执行。
     * @param path 相关的路径。
     * @param stats 文件的属性对象。
     */
    protected onChange(path: string) {

        // FIXME: 支持 windows 下路径不区分大小写?
        const addDep = (path: string) => {
            if (this.changedFiles.indexOf(path) >= 0) {
                return;
            }
            this.changedFiles.push(path);
            for (const key in this.deps) {
                if (this.deps[key].indexOf(path) >= 0) {
                    addDep(key);
                }
            }
        };

        then.then(() => {
            this.clear();
            addDep(path);
            this.task();
        });
        then.then(() => {
            info(this.changedFiles.length < 2 ? "[{gray:now}] {cyan:Changed}: {default:file}" : "[{gray:now}] {cyan:Changed}: {file} (+ {hidden} hidden modules)", {
                now: formatDate(undefined, "HH:mm:ss"),
                file: getDisplayName(path),
                hidden: this.changedFiles.length - 1
            });
        });
    }

    /**
     * 当监听到一个文件或文件夹删除后执行。
     * @param path 相关的路径。
     */
    protected onDelete(path: string) {
        then.then(() => {
            this.clear();
            this.changedFiles.push(path);
            file.workingMode |= file.WorkingMode.clean;
            this.task();
        });
        then.then(() => {
            file.workingMode &= ~file.WorkingMode.clean;
            info("[{gray:now}] {cyan:Deleted}: {file}", {
                now: formatDate(undefined, "HH:mm:ss"),
                file: getDisplayName(path)
            });
        });
    }

    private clear() {
        this.changedFiles.length = 0;
        file.fileCount = logging.errorCount = logging.warningCount = 0;
        then.asyncCount = 0;
    }

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     */
    protected onError(error: NodeJS.ErrnoException) { throw error; }

}

/**
 * 获取或设置当前使用的监听器。
 */
export var watcher: Watcher;

/**
 * 以监听方式执行一个任务。
 * @param task 要执行的任务名。
 * @param options 监听的选项。
 */
export function watch(task: Function, options?: FSWatcherOptions) {
    file.workingMode |= file.WorkingMode.watch;
    watcher = new Watcher(task, options);
    const onSaveFile = file.onSaveFile;
    file.onSaveFile = function (f) {
        if (!(file.workingMode & (file.WorkingMode.clean | file.WorkingMode.preview))) {
            if (f.deps) {
                watcher.deps[f.srcPath] = f.deps;
            }
        }
        return onSaveFile && onSaveFile.apply(this, arguments);
    };
    task();
    return watcher;
}
