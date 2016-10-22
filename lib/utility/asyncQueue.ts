/**
 * @fileOverview 异步队列
 * @author xuld<xuld@vip.qq.com>
 */
import { Queue } from "./queue";

/**
 * 表示一个异步队列。
 */
export class AsyncQueue extends Queue<(done?: () => void) => (Promise<any> | void)> {

    /**
     * 初始化新的队列。
     */
    constructor() {
        super();
        this.dequeue = this.dequeue.bind(this);
    }

    /**
     * 存储当前锁定的次数。
     */
    private lockCount = 0;

    /**
     * 锁定当前队列直到解锁后才继续执行已添加的函数。
     */
    lock() {
        this.lockCount++;
    }

    /**
     * 解锁当前队列以执行后续回调函数。
     */
    unlock() {
        this.lockCount--;
        this.dequeue();
    }

    /**
     * 创建和当前队列等价的确认对象。
     * @returns 返回一个确认对象。
     */
    promise() {
        return new Promise(resolve => {
            this.enqueue(resolve);
        });
    }

    /**
     * 在当前队列末尾添加一个异步任务。
     * @param callback 要添加的任务。
     */
    enqueue(callback: (done?: () => void) => (Promise<any> | void)) {
        const first = this.empty;
        super.enqueue(callback);
        if (first) {
            this.dequeue();
        }
    }

    /**
     * 从当前队列顶部取出一项。
     */
    dequeue() {

        // 如果已加锁，则等待解锁时继续。
        if (this.lockCount > 0) {
            return;
        }

        const item = super.dequeue();
        if (item) {
            if (item.length) {
                item(this.dequeue);
            } else {
                const promise = item();
                if (promise instanceof Promise) {
                    promise.then(this.dequeue, this.dequeue);
                } else {
                    this.dequeue();
                }
            }
        }
        return item;
    }

}
