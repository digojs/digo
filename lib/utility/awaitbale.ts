/**
 * @fileOverview 可等待对象
 * @author xuld<xuld@vip.qq.com>
 */
import { EventEmitter } from "events";

/**
 * 表示一个异步可等待对象。
 */
export class Awaitable extends EventEmitter {

    /**
     * 获取下一个异步等待对象。
     */
    private next: Awaitable;

    /**
     * 通知当前对象开始执行任务。
     */
    start() {

    }

    /**
     * 获取当前列表是否已处理完成。
     */
    protected ended: boolean;

    /**
     * 通知当前对象已执行任务完毕。
     */
    end() {
        this.ended = true;
        // this.emit("end");
        if (this.next) {
            this.next.start();
        }
    }

    /**
     * 等待执行的异步任务完成后执行当前任务。
     */
    wait(awaitable: Awaitable) {
        while (awaitable.next) awaitable = awaitable.next;
        awaitable.next = this;
    }

}


function queue() {

}
