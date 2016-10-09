/**
 * @fileOverview 异步队列
 * @author xuld<xuld@vip.qq.com>
 */

/**
 * 表示一个异步队列。
 */
export class AsyncQueue {

    /**
     * 获取正在等待的异步任务数。
     */
    length = 0;

    /**
     * 存储正在等待的异步项链表末尾。
     */
    private asyncEntries: AsyncEntry;

    /**
     * 记录将开始执行一个异步任务。
     */
    beginAsync() {
        this.length++;
    }

    /**
     * 记录已执行一个异步任务。
     */
    endAsync() {
        if (--this.length > 0) return;

        // 所有任务都执行完成：执行一个正在等待的异步项。
        if (this.asyncEntries) {
            process.nextTick(() => {
                while (this.asyncEntries && this.length <= 0) {
                    const head = this.asyncEntries.next;
                    if (head === this.asyncEntries) {
                        this.asyncEntries = null;
                    } else {
                        this.asyncEntries.next = head.next;
                    }
                    for (const task of head) {
                        task();
                    }
                }
                if (this.length <= 0) {
                    this.done();
                }
            });
        } else {
            this.done();
        }

    }

    /**
     * 当所有异步任务都完成后的回调函数。
     */
    done?() { }

    /**
     * 等待当前异步项全部完成后执行指定的回调。
     * @param callbacks 要执行的回调函数。
     */
    then(...callbacks: Function[]) {

        // 如果正在等待则加入队列。
        if (this.length > 0) {
            const end = this.asyncEntries;
            if (end) {
                (<AsyncEntry>callbacks).next = end.next;
                end.next = this.asyncEntries = callbacks;
            } else {
                (<AsyncEntry>callbacks).next = this.asyncEntries = callbacks;
            }
            return this;
        }

        // 未等待则直接执行任务。
        for (const task of callbacks) {
            task();
        }

        return this;
    }

    /**
     * 记录即将执行一个异步任务。
     * @param callback 异步任务完成时的回调函数。
     * @return 返回一个函数，通过调用此函数可通知当前异步任务已完成。
     */
    async<T extends Function>(callback?: T): T {
        this.beginAsync();
        const me = this;
        return <any>function asyncBound() {
            me.endAsync();
            return callback && callback.apply(this, arguments);
        };
    }

    /**
     * 创建和当前队列等价的确认对象。
     * @returns 返回一个确认对象。
     */
    promise() {
        return new Promise(resolve => {
            this.then(resolve);
        });
    }

    /**
     * 合并所有异步队列。
     * @param asyncQueues 要合并的异步队列。
     */
    static concat(...asyncQueues: AsyncQueue[]) {
        const result = new AsyncQueue();
        for (const asyncQueue of asyncQueues) {
            if (asyncQueue.length > 0) {
                result.beginAsync();
                asyncQueue.then(() => {
                    result.endAsync();
                });
            }
        }
        return result;
    }

}

/**
 * 表示一个异步项。
 */
interface AsyncEntry extends Array<Function> {

    /**
     * 获取下一个异步项。
     */
    next?: AsyncEntry;

}
