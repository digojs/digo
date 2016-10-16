/**
 * @fileOverview 链表队列
 * @author xuld<xuld@vip.qq.com>
 */

/**
 * 表示一个链表队列。
 */
export class LinkedQueue {

    /**
     * 获取当前队列的最后一项。
     */
    protected end: LinkedListEntry;

    /**
     * 获取当前队列的长度。
     */
    get length() {
        if (!this.end) {
            return 0;
        }
        let count = 1;
        for (let item = this.end.next; item !== this.end; item = item.next) {
            count++;
        }
        return count;
    }

    /**
     * 将指定的项添加到队列。
     * @param item 要添加的项。
     */
    enqueue(item: LinkedListEntry) {
        const end = this.end;
        if (end) {
            item.next = end.next;
            end.next = this.end = item;
        } else {
            item.next = this.end = item;
        }
    }

    /**
     * 取出队列第一个项。
     * @returns 返回列表第一项。如果不存在项则返回 undefined。
     */
    dequeue() {
        if (!this.end) {
            return;
        }
        const head = this.end.next;
        if (head === this.end) {
            this.end = undefined;
        } else {
            this.end.next = head.next;
        }
        return head;
    }

}

/**
 * 表示一个队列项。
 */
export interface LinkedListEntry {

    /**
     * 获取当前队列项的下一个项。
     */
    next?: LinkedListEntry;

}
