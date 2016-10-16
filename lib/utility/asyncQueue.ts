/**
 * @fileOverview 异步队列
 * @author xuld<xuld@vip.qq.com>
 */
import { EventEmitter } from "events";
import { LinkedQueue, LinkedListEntry } from "./linkedQueue";

/**
 * 表示一个异步队列。
 */
export class AsyncQueue extends LinkedQueue {

    /**
     * 在当前队列末尾添加一个可等待的对象。
     * @param awaitable 要添加的对象。
     */
    enqueue(awaitable: Awaitable) {
        const first = !this.end;
        super.enqueue(awaitable);
        if (first) {
            process.nextTick(() => {
                this.dequeue();
            });
        }
    }

    /**
     * 从当前队列顶部取出一项。
     */
    dequeue() {
        const item = <Awaitable>super.dequeue();
        if (item) {
            item.emit("start");
        }
        return item;
    }

}

/**
 * 表示一个可等待的对象。
 */
export interface Awaitable extends EventEmitter, LinkedListEntry {

}
