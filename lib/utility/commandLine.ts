import { createInterface, ReadLine } from "readline";

/**
 * 解析控制台命令的选项。
 * @param argv 要解析的命令行参数列表。
 * @param startIndex 开始解析的索引。
 * @return 返回已解析的参数键值对。
 */
export function parseArgs(argv = process.argv, startIndex = 2) {
    const result: { [name: number]: string;[name: string]: true | string | string[]; } = { __proto__: null! };
    for (let count = 0; startIndex < argv.length; startIndex++) {
        const arg = argv[startIndex];
        if (arg.charCodeAt(0) === 45/*-*/) {
            const key = arg.replace(/^\-\-?/, "").replace(/\-([a-z])/, (_, word: string) => word.toUpperCase());
            const oldValue = result[key];
            if (startIndex + 1 < argv.length && argv[startIndex + 1].charCodeAt(0) !== 45/*-*/) {
                const newValue = argv[++startIndex];
                if (Array.isArray(oldValue)) {
                    oldValue.push(newValue);
                } else if (oldValue !== undefined && oldValue !== true) {
                    result[key] = [oldValue, newValue];
                } else {
                    result[key] = newValue;
                }
            } else if (oldValue == undefined) {
                result[key] = true;
            }
        } else {
            result[count++] = arg;
        }
    }
    return result;
}

/**
 * 等待命令行输入并继续。
 * @param message 询问的问题。
 * @param callback 用户回答后的回调函数。
 * @return 返回命令行接口。
 */
export function question(message: string, callback: (answer: string) => boolean | void) {
    const result = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    result.question(message, answer => {
        result.close();
        if (callback(answer) === false) {
            question(message, callback);
        }
    });
    return result;
}
