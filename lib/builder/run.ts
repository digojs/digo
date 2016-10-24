/**
 * @fileOverview 命令行
 * @author xuld <xuld@vip.qq.com>
 */
import { getDir, resolvePath, isAbsolutePath, getExt, getFileName } from "../utility/path";
import { formatHRTime, formatDate } from "../utility/date";
import { addGlobalPath } from "../utility/requireHelper";
import { getDisplayName, errorCount, warningCount, info, log, LogLevel, fatal } from "./logging";
import { then } from "./then";
import { begin, end } from "./progress";
import { plugin } from "./plugin";
import { workingMode, WorkingMode, fileCount } from "./file";
import { watch, watcher } from "./watch";

/**
 * 是否允许在配置文件中直接载入全局安装的模块。
 */
export var requireGlobal = true;

/**
 * 所有支持的配置文件扩展名。
 */
export const extensions = {
    ".ts": ['ts-node/register', 'typescript-node/register', 'typescript-register', 'typescript-require'],
    '.coffee': ['coffee-script/register', 'coffee-script'],
    '.cjsx': ['node-cjsx/register']
};

/**
 * 载入配置文件。
 * @param path 要载入的配置文件路径。
 * @param updateCwd 是否更新当前工作目录。
 * @return 返回配置文件定义的所有任务。如果载入错误则返回 undefined。
 */
export function loadDigoFile(path: string, updateCwd?: boolean) {

    path = resolvePath(path);

    const taskId = begin("Load file: {digofile}", { digofile: getDisplayName(path) });
    try {

        // 切换当前目录。
        if (updateCwd !== false) {
            const dir = getDir(path);
            if (process.cwd() !== dir) {
                process.chdir(dir);
            }
        }

        // 支持自定义扩展名。
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
                    fatal("Cannot find compiler for '{ext}' modules. Use 'npm install {module}' to install.", {
                        ext,
                        module: extensions[ext][0]
                    });
                    return {};
                }
            } else {
                fatal("Cannot find compiler for '{ext}' modules.", {
                    ext
                });
                return {};
            }
        }

        // 将当前类库加入全局路径以便 require("digo") 可以正常工作。
        if (requireGlobal) {
            requireGlobal = false;
            let digoPath = resolvePath(__dirname, "../..");
            if (getFileName(digoPath) === "_build") digoPath = getDir(digoPath);
            addGlobalPath(getDir(digoPath));
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

        return tasks;
    } finally {
        end(taskId);
    }
}

/**
 * 本次生成操作的开始时间。
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
export function run(task: () => void, taskName?: string, watchMode?: boolean) {

    // 准备工作。
    startTime = process.hrtime();
    if (!taskName) taskName = task.name || "TASK";

    // 执行任务。
    const taskId = begin("Execute task: {task}", { task: taskName });
    if (watchMode) {
        watch(task);
    } else {
        task();
    }

    // 统计结果。
    then(() => {
        end(taskId);
        if (report) {
            log(`{gray:now} {${watcher && watcher.isWatching ? "cyan:Start Watching..." :
                workingMode === WorkingMode.clean ? "cyan:Clean Completed!" :
                    workingMode === WorkingMode.preview ? "cyan:Preview Completed!" :
                        fileCount === 0 ? "cyan:Done!" : errorCount > 0 ? "red:Build Completed!" : warningCount > 0 ? "yellow:Build Success!" : "green:Build Success!"
                }} (error: {${errorCount ? "red:" : ""}error}, warning: {${warningCount ? "yellow:" : ""}warning}, ${fileCount > 0 ? "file: {file}, " : ""}elapsed: {elapsed})`, {
                    error: errorCount,
                    warning: warningCount,
                    file: fileCount,
                    elapsed: formatHRTime(process.hrtime(startTime)),
                    now: formatDate(undefined, "[HH:mm:ss]")
                }, errorCount > 0 ? LogLevel.failure : LogLevel.success);
        }
    });

}
