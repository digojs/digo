/**
 * @fileOverview 异步队列
 * @author xuld <xuld@vip.qq.com>
 */
import { Queue } from "./queue";

/**
 * 表示一个异步回调函数。
 * @param done 如果函数声明了 done 形参，则表示当前函数是异步的，函数应在异步任务完成后主动调用 done。
 * @returns 如果函数返回一个确认对象(Promise)，则队列会自动等待此对象。
 */
export type AsyncCallback = (done?: () => void) => (Promise<any> | void);

/**
 * 表示一个异步队列。
 * @remark
 * 异步队列可以缓冲多个同步或异步的函数，让这些函数按顺序执行。
 * 队列支持锁定/解锁模型，加锁时，所以等待的异步函数都会等待解锁。
 * @example
 * var q = new AsyncQueue();
 * q.enquee(() => { });
 * q.enquee(done => { setTimeout(done, 1000); });
 * q.enquee(() => new Promise(resolve => setTimeout(resolve, 1000)));
 * q.enquee(() => { q.lock(); setTimeout(() => q.unlock(), 1000); });
 */
export class AsyncQueue extends Queue<AsyncCallback> {

    /**
     * 初始化新的异步队列。
     */
    constructor() {
        super();
        this.unlock = this.unlock.bind(this);
    }

    /**
     * 存储当前锁定的次数。
     */
    private _lock = 0;

    /**
     * 锁定当前队列。锁定后所有函数都将进入等待状态。
     */
    lock() {
        this._lock++;
    }

    /**
     * 解锁当前队列。解锁后所有函数恢复执行。
     */
    unlock() {
        this._lock--;
        console.assert(this._lock >= 0, "AsyncQueue: mismatched lock() & unlock() call");
        this.dequeue();
    }

    /**
     * 在当前队列末尾添加一个回调函数。
     * @param callback 要添加的回调函数。
     */
    enqueue(callback: AsyncCallback) {
        const first = this.empty;
        super.enqueue(callback);
        if (first) {
            this.dequeue();
        }
    }

    /**
     * 从当前队列顶部取出一个回调函数并执行。
     * @returns 返回取出的回调函数。如果队列为空或已锁定则返回 undefined。
     */
    dequeue() {
        if (this._lock > 0) {
            return;
        }
        const item = super.dequeue();
        if (item) {
            this.lock();
            if (item.length) {
                item(this.unlock);
            } else {
                const promise = item();
                if (promise instanceof Promise) {
                    promise.then(this.unlock, this.unlock);
                } else {
                    this.unlock();
                }
            }
        }
        return item;
    }

    /**
     * 创建和当前队列等价的确认对象(Promise)。
     * @returns 返回一个确认对象(Promise)。
     */
    promise() {
        return new Promise(resolve => this.enqueue(resolve));
    }

}
