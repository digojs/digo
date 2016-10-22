/**
 * @fileOverview 队列
 * @author xuld<xuld@vip.qq.com>
 */

/**
 * 表示一个队列。
 */
export class Queue<T> {

    /**
     * 存储当前队列的最后一项。
     */
    private last: QueueEntry<T>;

    /**
     * 判断当前队列是否为空。
     */
    get empty() {
        return this.last == undefined;
    }

    /**
     * 获取当前队列的长度。
     */
    get length() {
        if (this.last == undefined) {
            return 0;
        }
        let count = 1;
        for (let item = this.last.next; item !== this.last; item = item.next) {
            count++;
        }
        return count;
    }

    /**
     * 获取当前队列的迭代器。
     */
    [Symbol.iterator]() {
        return <Iterator<T>>{
            target: this,
            current: this.last,
            end: false,
            next() {
                if (this.current == undefined || this.end) {
                    return { value: undefined, done: true };
                }
                this.current = this.current.next;
                if (this.current === this.target.last) {
                    this.end = true;
                }
                return { value: this.current.value, done: false };
            }
        };
    }

    /**
     * 获取队列顶部的值。
     */
    get top() {
        return this.last ? this.last.next.value : undefined;
    }

    /**
     * 将指定的项添加到队列末尾。
     * @param item 要添加的项。
     */
    enqueue(item: T) {
        const end = this.last;
        if (end) {
            this.last = end.next = {
                value: item,
                next: end.next
            };
        } else {
            const entry: QueueEntry<T> = { value: item };
            this.last = entry.next = entry;
        }
    }

    /**
     * 取出队首的项。
     * @returns 返回列表第一项。如果不存在项则返回 undefined。
     */
    dequeue() {
        if (!this.last) {
            return;
        }
        const head = this.last.next;
        if (head === this.last) {
            this.last = undefined;
        } else {
            this.last.next = head.next;
        }
        return head.value;
    }

    /**
     * 获取当前对象的展示形式。
     */
    private inspect() {
        return `[${this.toString()}]`;
    }

    /**
     * 获取当前队列的等效数组。
     */
    toArray() {
        const result = [];
        if (this.last) {
            for (let item = this.last.next; item !== this.last; item = item.next) {
                result.push(item.value);
            }
            result.push(this.last.value);
        }
        return result;
    }

    /**
     * 获取当前队列的等效字符串。
     */
    toString() {
        return this.toArray().toString();
    }

}

/**
 * 表示一个队列项。
 */
interface QueueEntry<T> {

    /**
     * 存储当前项的值。
     */
    value: T;

    /**
     * 存储当前项的下一个项。
     */
    next?: QueueEntry<T>;

}
