/**
 * @fileOverview 进度控制
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { formatDate } from "../utility/date";
import { AsyncQueue } from "../utility/asyncQueue";
import { updateProgressBar } from "../utility/progressBar";
import { addLogColor, ConsoleColor } from "../utility/log";
import { logLevel, LogLevel, log, format, verbose } from "./logging";

/**
 * 获取所有异步任务数。
 */
export var asyncCount = 0;

/**
 * 获取全局的异步队列。
 */
export var asyncQueue = new AsyncQueue();

/**
 * 获取或设置是否在控制台显示进度条。
 */
export var progress = !!(<boolean | void>(<WriteStream>process.stdout).isTTY);

/**
 * 记录将开始执行指定的任务。
 * @param message 任务内容。
 * @param args 格式化参数。*message* 中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回任务序号。
 */
export function beginAsync(message?: string, args?: Object) {
    asyncCount++;
    asyncQueue.beginAsync();
    message = message ? format(message, args) : "(TASK " + asyncCount + ")";
    if (logLevel === LogLevel.verbose) {
        verbose("[{gray:now}]Starting: {default:message}", {
            now: formatDate(undefined, "HH:mm:ss"),
            message: message
        });
    }
    if (progress) {
        updateProgressBar(`(${addLogColor(asyncCount - asyncQueue.length + "/" + asyncCount, ConsoleColor.cyan)}) ${message}`);
    }
    return message;
}

/**
 * 记录已执行指定的任务。
 * @param taskId 要结束的任务序号。
 * @return 返回执行当前任务花费的总毫秒数。
 */
export function endAsync(taskId: string) {
    asyncQueue.endAsync();
    if (progress && !asyncQueue.length) {
        updateProgressBar(null);
    }
    if (logLevel === LogLevel.verbose) {
        verbose("[{gray:now}]Finished: {default:message}", {
            now: formatDate(undefined, "HH:mm:ss"),
            message: taskId
        });
    }
}

/**
 * 等待当前任务全部完成后执行指定的任务。
 * @param tasks 要执行的任务。
 */
export function then(...tasks: Function[]) {
    return asyncQueue.then(...tasks);
}

/**
 * 记录即将执行一个异步任务。
 * @param callback 异步任务完成时的回调函数。
 * @param message 任务内容。
 * @param args 格式化参数。*message* 中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回一个函数，通过调用此函数可通知当前异步任务已完成。
 */
export function async<T extends Function>(callback?: T, message?: string, args?: Object): T {
    const taskId = beginAsync(message, args);
    return <any>function asyncBound() {
        endAsync(taskId);
        return callback && callback.apply(this, arguments);
    };
}
