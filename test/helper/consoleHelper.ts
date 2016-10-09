
const write = (<any>process.stdout).__proto__.write;
const error = (<any>process.stderr).__proto__.write;

/**
 * 获取拦截的输出。
 */
export const outputs = [];

/**
 * 拦截控制台输出。
 */
export function init() {
    outputs.length = 0;
    (<any>process.stderr).__proto__.write = (<any>process.stdout).__proto__.write = function (buffer, cb?, cb2?) {
        outputs.push(buffer.toString());
        if (typeof cb === "function") cb();
        if (typeof cb2 === "function") cb2();
        return true;
    };
}

/**
 * 恢复控制台输出。
 */
export function uninit() {
    (<any>process.stdout).__proto__.write = write;
    (<any>process.stderr).__proto__.write = error;
}
