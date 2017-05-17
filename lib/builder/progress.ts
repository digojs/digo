import { WriteStream } from "tty";
import { formatDate } from "../utility/lang";
import { addLogColor, ConsoleColor } from "../utility/log";
import { updateStatus } from "../utility/statusBar";
import { format, logLevel, LogLevel, verbose } from "./logging";

/**
 * 是否在控制台显示进度。
 */
export var progress = (process.stdout as WriteStream).isTTY === true;

/**
 * 获取所有任务数。
 */
export var taskCount = 0;

/**
 * 获取所有已完成的任务数。
 */
export var doneTaskCount = 0;

/**
 * 记录将开始执行指定的任务。
 * @param task 任务内容。
 * @param args 格式化参数。*task* 中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回任务序号。
 */
export function begin(task: string, args?: Object) {
    taskCount++;
    task = format(task, args);
    if (logLevel === LogLevel.verbose) {
        verbose("{brightBlack:now} Starting: {task}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            task: task
        });
    } else if (progress) {
        updateStatus(`${addLogColor(`(${doneTaskCount}/${taskCount})`, ConsoleColor.cyan)} ${task}`);
    }
    return task;
}

/**
 * 记录已执行指定的任务。
 * @param task 要结束的任务序号。
 */
export function end(task: string) {
    doneTaskCount++;
    if (logLevel === LogLevel.verbose) {
        verbose("{brightBlack:now} Finished: {task}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            task: task
        });
    } else if (progress && doneTaskCount === taskCount) {
        updateStatus(null);
    }
}
