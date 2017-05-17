/**
 * 执行函数并捕获控制台输出内容。
 * @param func 要执行的函数。
 * * @param outputs 接收捕获的控制台输出内容。
 * * @param done 如果函数是异步的，则应在异步结束后调用此回调函数。
 * @return 返回原函数的返回值。
 */
export function redirectOutput(func: (outputs: string[], done: () => void) => any) {
    const outputs: string[] = [];
    const oldStdoutWrite = (process.stdout as any).__proto__.write;
    const oldStdErrorWrite = (process.stderr as any).__proto__.write;
    (process.stderr as any).__proto__.write = (process.stdout as any).__proto__.write = (buffer: Buffer, cb1?: Function, cb2?: Function) => {
        if (buffer && buffer.length) {
            outputs.push(buffer.toString());
        }
        if (typeof cb1 === "function") {
            cb1();
        }
        if (typeof cb2 === "function") {
            cb2();
        }
        return true;
    };
    const restore = () => {
        (process.stdout as any).__proto__.write = oldStdoutWrite;
        (process.stderr as any).__proto__.write = oldStdErrorWrite;
    };
    if (func.length <= 1) {
        try {
            return (func as Function)(outputs);
        } finally {
            restore();
        }
    } else {
        try {
            return func(outputs, restore);
        } catch (e) {
            restore();
            throw e;
        }
    }
}
