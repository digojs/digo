import { AsyncCallback } from "../utility/asyncQueue";
import { formatDate, formatHRTime } from "../utility/lang";
import { getDir, getExt, resolvePath } from "../utility/path";
import { addRequirePath, resolveRequirePath } from "../utility/require";
import { then } from "./async";
import { buildMode, BuildMode, fileCount } from "./file";
import { errorCount, fatal, getDisplayName, info, LogLevel, warningCount } from "./logging";
import { plugin } from "./plugin";
import { begin, end } from "./progress";
import { server, startServer } from "./server";
import { watch, watcher } from "./watch";

/**
 * 是否允许直接载入全局安装的模块。
 */
export var requireGlobal = true;

/**
 * 所有支持的配置文件扩展名。
 */
export const extensions: { [ext: string]: string[] } = {
    ".ts": ["ts-node/register", "typescript-node/register", "typescript-register", "typescript-require"],
    ".coffee": ["coffee-script/register", "coffee-script"]
};

/**
 * 载入配置文件。
 * @param path 要载入的配置文件路径。
 * @param updateCwd 是否更新当前工作目录。
 * @return 返回配置文件定义的所有任务。如果载入错误则返回 undefined。
 */
export function loadDigoFile(path = "digofile.js", updateCwd = true) {
    path = resolvePath(path);
    const task = begin("Using: {digofile}", { digofile: getDisplayName(path) });
    const result: { [key: string]: Function; } = { __proto__: null! };
    try {
        if (requireGlobal) {
            addRequirePath(getDir(resolveRequirePath("digo") || resolvePath(__dirname, "../..")));
        }
        if (updateCwd !== false) {
            const dir = getDir(path);
            if (process.cwd() !== dir) {
                process.chdir(dir);
            }
        }
        const ext = getExt(path);
        if (!require.extensions[ext]) {
            if (ext in extensions) {
                let found = false;
                for (const name of extensions[ext]) {
                    try {
                        plugin(name);
                        found = true;
                        break;
                    } catch (e) {
                    }
                }
                if (!found) {
                    fatal("Cannot find compiler for '{bright:digofile}'. Run 'npm install {module}' and retry.", {
                        digofile: path,
                        module: extensions[ext][0]
                    });
                    return result;
                }
            } else {
                fatal("Cannot find compiler for '{bright:digofile}'.", {
                    digofile: path
                });
                return result;
            }
        }
        const config = require(path);
        for (const key in config) {
            if (typeof config[key] === "function") {
                result[key] = config[key];
            }
        }
    } finally {
        end(task);
    }
    return result;
}

/**
 * 获取本次生成操作的开始时间。
 */
export var startTime: [number, number];

/**
 * 是否在生成完成后报告结果。
 */
export var report = true;

/**
 * 执行一个任务。
 * @param task 要执行的任务。
 * @param taskName 任务名。
 */
export function run(task: AsyncCallback, taskName = task.name || "<anonymous task>") {
    startTime = process.hrtime();
    const taskId = begin("Executing task: {task}", { task: taskName });
    if (buildMode === BuildMode.server) {
        startServer({
            task: task
        });
    } else if (buildMode === BuildMode.watch) {
        watch(task);
    } else {
        then(task);
    }
    then(() => {
        end(taskId);
        if (report) {
            info(`{brightBlack:now} {${server && server!.isListening ? "brightCyan:Server started at }{bright:url" :
                watcher && watcher!.isWatching ? "brightCyan:Start watching..." :
                    buildMode === BuildMode.clean ? "brightCyan:Clean completed!" :
                        buildMode === BuildMode.preview ? "brightCyan:Build(Preview) completed!" :
                            fileCount === 0 ? "brightCyan:Done!" : errorCount > 0 ? "brightRed:Build completed!" : warningCount > 0 ? "brightYellow:Build success!" : "brightGreen:Build success!"
                }} (error: {${errorCount ? "brightRed:" : ""}error}, warning: {${warningCount ? "brightYellow:" : ""}warning}, ${fileCount > 0 ? "file: {file}, " : ""}elapsed: {elapsed}) `, {
                    error: errorCount,
                    warning: warningCount,
                    file: fileCount,
                    elapsed: formatHRTime(process.hrtime(startTime)),
                    now: formatDate(undefined, "[HH:mm:ss]"),
                    url: server && server!.url
                });
        }
    });
}
