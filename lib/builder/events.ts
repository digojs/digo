import { EventEmitter } from "events";

/**
 * 全局事件处理器。
 */
export const events = new EventEmitter();

/**
 * 绑定一个事件。
 * @param event 要绑定的事件名。
 * @param listener 要绑定的事件监听器。
 */
export function on(event: string | symbol, listener: (...args: any[]) => void) {
    events.addListener(event, listener);
}

/**
 * 解绑一个或多个事件。
 * @param event 要解绑的事件名。如果不传递则解绑所有事件。
 * @param listener 要解绑的事件监听器。如果不传递则解绑所有监听器。
 */
export function off(event?: string | symbol, listener?: (...args: any[]) => void) {
    if (listener) {
        events.removeListener(event!, listener);
    } else if (event) {
        events.removeAllListeners(event);
    } else {
        for (const event of events.eventNames()) {
            events.removeAllListeners(event);
        }
    }
}

/**
 * 触发一个事件。
 * @param event 要触发的事件名。
 * @param args 传递给监听器的参数列表。
 * @return 如果事件被成功处理则返回 true，否则返回 false。
 */
export function emit(event: string | symbol, ...args: any[]) {
    return events.emit(event, ...args);
}
