/**
 * @fileOverview 命令行
 * @author xuld <xuld@vip.qq.com>
 */
import { getDir, resolvePath, isAbsolutePath } from "../utility/path";
import { formatHRTime, formatDate } from "../utility/date";
import { getDisplayName, format, errorCount, warningCount, info, log, LogLevel } from "./logging";
import { beginAsync, endAsync, then } from "./async";
import { workingMode, WorkingMode, fileCount } from "./file";
import { watch, watcher } from "./watch";

/**
 * 是否允许在配置文件中直接载入全局安装的模块。
 */
export var requireGlobal = true;

/**
 * 载入配置文件。
 * @param path 要载入的配置文件路径。
 * @return 返回配置文件定义的所有任务。如果载入错误则返回 undefined。
 */
export function loadConfig(path: string) {
    const taskId = beginAsync("Load config: {config}", { config: getDisplayName(path) });

    // 切换当前目录。
    const dir = getDir(path);
    if (process.cwd() !== dir) {
        process.chdir(dir);
    }

    // 支持 .ts/.coffee
    if (/.ts$/i.test(path)) {
        require("typescript-require")();
    } else if (/.coffee$/i.test(path)) {
        require("coffee-script/register");
    }

    // 将当前类库加入全局路径以便 require("digo") 可以正常工作。
    if (requireGlobal) {
        const libPath = resolvePath(__dirname, "../../..");
        const Module = require("module").Module;
        const oldResolveLookupPaths = Module._resolveLookupPaths;
        Module._resolveLookupPaths = function (request, parent) {
            const result = oldResolveLookupPaths.apply(this, arguments);
            // 如果请求的模块是全局模块，则追加全局搜索路径。
            if (result[1].indexOf(libPath) < 0 && !/^[\.\\\/]/.test(request) && !isAbsolutePath(request)) {
                result[1].push(libPath);
            }
            return result;
        };
    }

    // 加载并执行配置文件。
    const config = require(path);

    // 找出任务函数。
    const tasks: { [key: string]: Function; } = { __proto__: null };
    for (const key in config) {
        if (typeof config[key] === "function") {
            tasks[key] = config[key];
        }
    }

    endAsync(taskId);
    return tasks;
}

/**
 * 本次生成操作的开始时间。
 */
export var startTime: number[];

/**
 * 是否在生成完成后报告结果。
 */
export var report = true;

/**
 * 执行一个任务。
 * @param task 要执行的任务。
 * @param taskName 任务名。
 */
export function run(task: Function, taskName?: string) {

    // 准备工作。
    startTime = process.hrtime();
    if (!taskName) taskName = task.name || "TASK";

    // 执行任务。
    const taskId = beginAsync("Executing task: {task}", { task: taskName });
    if (workingMode & WorkingMode.watch) {
        watch(task);
    } else {
        task();
    }
    endAsync(taskId);

    // 统计结果。
    if (report) {
        then(() => {
            log(`{${watcher && watcher.isWatching ? "cyan:Start Watching..." :
                workingMode & WorkingMode.clean ? "cyan:Clean Completed!" :
                    workingMode & WorkingMode.preview ? "cyan:Preview Completed!" :
                        fileCount === 0 ? "cyan:Done" : errorCount > 0 ? "red:Build Completed!" : warningCount > 0 ? "yellow:Build Success!" : "green:Build Success!"
                }} (error: {${errorCount ? "red:" : ""}error}, warning: {${warningCount ? "yellow:" : ""}warn}, ${fileCount > 0 ? "file: {file}, " : ""}time: {elapsed}, {gray:now})`, {
                    error: errorCount,
                    warn: warningCount,
                    file: fileCount,
                    elapsed: formatHRTime(process.hrtime(startTime)),
                    now: formatDate(undefined, "HH:mm:ss")
                }, errorCount > 0 ? LogLevel.failure : LogLevel.success);
        });
    }

}
