/**
 * @fileOverview 进度控制
 * @author xuld <xuld@vip.qq.com>
 */
import { AsyncQueue } from "../utility/asyncQueue";

/**
 * 获取全局的异步队列。
 */
export var asyncQueue = new AsyncQueue();

/**
 * 等待当前任务全部完成后执行指定的任务。
 * @param callback 要执行的任务。
 */
export function then(callback: (done?: Function) => (Promise<any> | void)) {
    asyncQueue.enqueue(callback);
    return this;
}
