import Queue from "./queue";

/**
 * 表示一个异步回调函数。
 * @return 如果函数返回一个确认对象(Promise)，则异步队列会自动等待此对象。
 */
export type AsyncCallback = () => Promise<any> | void;

/**
 * 表示一个异步队列。
 * @desc
 * 异步队列可以缓冲多个函数，让这些函数串行执行。
 * 队列实现了加锁/解锁模型，加锁时，所以函数都会等待解锁后再执行。
 * @example
 * var q = new AsyncQueue();
 * q.enquee(function () { });
 * q.enquee(function (done) { setTimeout(done, 1000); });
 * q.enquee(function () { return new Promise(resolve => setTimeout(resolve, 1000)); });
 * q.enquee(function () { q.lock(); setTimeout(() => q.unlock(), 1000); });
 */
export class AsyncQueue extends Queue<AsyncCallback> {

    /**
     * 存储当前锁定的次数。
     */
    private _lock = 0;

    /**
     * 锁定当前队列。锁定后所有函数都将进入等待状态。
     * @param message 指定锁定的来源以供调试。
     */
    lock(message?: string) {
        // 删除此注释以启用异步调试：
        // require("fs").appendFileSync("./async-debug.log", "\n+" + message);
        this._lock++;
    }

    /**
     * 解锁当前队列。解锁后所有函数恢复执行。
     * @param message 指定锁定的来源以供调试。
     */
    unlock = (message?: string) => {
        // 删除此注释以启用异步调试：
        // require("fs").appendFileSync("./async-debug.log", "\n-" + message);
        console.assert(this._lock > 0, `AsyncQueue: unexpected unlock(). ${message || ""}`);
        this._lock--;
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
     * @return 返回取出的回调函数。如果队列为空或已锁定则返回 undefined。
     */
    dequeue() {
        if (this._lock === 0) {
            const item = super.dequeue();
            if (item) {
                this.lock();
                const ret = item();
                if (ret instanceof Promise) {
                    ret.then(this.unlock, this.unlock);
                } else {
                    this.unlock();
                }
            }
            return item;
        }
    }

    /**
     * 创建和当前队列等价的确认对象(Promise)。
     * @return 返回一个确认对象(Promise)。
     */
    promise() { return new Promise(resolve => this.enqueue(resolve)); }

}

export default AsyncQueue;
