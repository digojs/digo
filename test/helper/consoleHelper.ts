
/**
 * 拦截控制台输出。
 * @param func 要执行的函数。
 * @param callback 执行的回调。
 */
export function redirectOutput(func: (outputs: string[]) => void) {
    const outputs = [];
    const write = (<any>process.stdout).__proto__.write;
    const error = (<any>process.stderr).__proto__.write;
    (<any>process.stderr).__proto__.write = (<any>process.stdout).__proto__.write = function (buffer, cb?, cb2?) {
        outputs.push(buffer.toString());
        if (typeof cb === "function") cb();
        if (typeof cb2 === "function") cb2();
        return true;
    };

    try {
        func(outputs);
    } finally {
        (<any>process.stdout).__proto__.write = write;
        (<any>process.stderr).__proto__.write = error;
    }

}
