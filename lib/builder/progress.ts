/**
 * @fileOverview 进度条
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { formatDate } from "../utility/date";
import { addLogColor, ConsoleColor } from "../utility/log";
import { updateProgressBar } from "../utility/progressBar";
import { logLevel, LogLevel, format, verbose } from "./logging";

/**
 * 获取或设置是否在控制台显示进度条。
 */
export var progress = !!(<boolean | void>(<WriteStream>process.stdout).isTTY);

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
 * @param message 任务内容。
 * @param args 格式化参数。*message* 中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回任务序号。
 */
export function begin(message?: string, args?: Object) {
    taskCount++;
    message = message ? format(message, args) : "TASK#" + taskCount;
    if (logLevel === LogLevel.verbose) {
        verbose("{gray:now} Starting: {default:message}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            message: message
        });
    }
    if (progress) {
        updateProgressBar(`${addLogColor(`(${doneTaskCount}/${taskCount})`, ConsoleColor.cyan)} ${message}`);
    }
    return message;
}

/**
 * 记录已执行指定的任务。
 * @param taskId 要结束的任务序号。
 */
export function end(taskId: string) {
    doneTaskCount++;
    if (progress && doneTaskCount === taskCount) {
        updateProgressBar(null);
    }
    if (logLevel === LogLevel.verbose) {
        verbose("{gray:now} Finished: {default:message}", {
            now: formatDate(undefined, "[HH:mm:ss]"),
            message: taskId
        });
    }
}
