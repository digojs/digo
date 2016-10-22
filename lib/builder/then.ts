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

    // 等待当前队列完成。
    asyncQueue.enqueue(done => {

        // 考虑这个场景：
        //      then(() => {
        //         1
        //         then(() => { 
        //             2
        //         }) 
        //      })
        //      then(() => {
        //         3
        //      })
        // 假如只有一个队列，那么入队的顺序是 1, 3, 2(根据 then 的执行顺序决定)
        // 而作者可能更期望的执行顺序是：1, 2, 3。
        // 为了实现这个目标，我们在执行每个回调函数，都会创建一个新的子队列。
        // 父队列会等待所有子队列都完成后才继续。

        // 创建子队列。
        const oldQueue = asyncQueue;
        asyncQueue = new AsyncQueue();

        // 执行 callback。
        if (callback.length) {
            asyncQueue.lock();
            callback(() => {
                asyncQueue.unlock();
            });
        } else {
            callback();
        }

        // 子队列执行完成后解锁当前队列。
        asyncQueue.enqueue(() => {
            asyncQueue = oldQueue;
            done();
        });
    });
    return this;
}
