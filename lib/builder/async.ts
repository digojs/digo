/**
 * @fileOverview 异步
 * @author xuld <xuld@vip.qq.com>
 */
import { formatDate, formatHRTime } from "../utility/date";
import { logLevel, LogLevel, info, log, format, verbose } from "./logging";
import { updateProgress } from "./progress";

/**
 * 获取所有任务数。
 */
export var taskCount = 0;

/**
 * 获取正在等待的任务数。
 */
export var pendingTaskCount = 0;

/**
 * 表示一个正在等待的任务。
 */
interface PendingTask extends Array<Function> {

    /**
     * 下一个等待的任务。
     */
    next?: PendingTask;

}

/**
 * 存储正在等待的异步任务链表末尾。
 */
export var pendingTasks: PendingTask;

/**
 * 等待当前任务全部完成后执行指定的任务。
 * @param tasks 要执行的任务。
 */
export function then(...tasks: Function[]) {

    // 如果正在等待则加入队列。
    if (pendingTaskCount) {
        const end = pendingTasks;
        if (end) {
            (<PendingTask>tasks).next = end.next;
            end.next = pendingTasks = tasks;
        } else {
            (<PendingTask>tasks).next = pendingTasks = tasks;
        }
        return this;
    }

    // 未等待则直接执行任务。
    for (const task of tasks) {
        task();
    }

    return this;
}

/**
 * 记录将开始执行指定的任务。
 * @param message 任务内容。
 * @param args 格式化参数。*message* 中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回任务序号。
 */
export function beginAsync(message?: string, args?: Object) {
    taskCount++;
    pendingTaskCount++;
    message = message ? format(message, args) : "(TASK " + taskCount + ")";
    if (message.charCodeAt(0) !== 40/*(*/) {
        updateProgress(message);
    }
    if (logLevel === LogLevel.verbose) {
        verbose("[{gray:now}]BEGIN: {default:message}", {
            now: formatDate(undefined, "HH:mm:ss"),
            message
        });
    }
    return message;
}

/**
 * 记录已执行指定的任务。
 * @param taskId 要结束的任务序号。
 * @return 返回执行当前任务花费的总毫秒数。
 */
export function endAsync(taskId: string) {

    pendingTaskCount--;

    // 更新日志和进度条。
    if (logLevel === LogLevel.verbose) {
        verbose("[{gray:now}]END: {default:message}", {
            now: formatDate(undefined, "HH:mm:ss"),
            message: taskId
        });
    }

    // 如果没有其它等待的任务则推进队列。
    while (!pendingTaskCount && pendingTasks) {
        const head = pendingTasks.next;
        if (head === pendingTasks) {
            pendingTasks = null;
        } else {
            pendingTasks.next = head.next;
        }
        for (const task of head) {
            task();
        }
    }

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
        const result = callback && callback.apply(this, arguments);
        endAsync(taskId);
        return result;
    };
}
