/**
 * @fileOverview 执行命令
 * @author xuld <xuld@vip.qq.com>
 */
import { exec as _exec, execSync as _execSync, ExecOptionsWithStringEncoding } from "child_process";
import { beginAsync, endAsync } from "./async";
import { log, error } from "./logging";

/**
 * 异步执行一个命令行程序。
 * @param command 要执行的命令行。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @return 返回启动的子进程。
 */
export function exec(command: string, options?: ExecOptionsWithStringEncoding) {
    const taskId = beginAsync(command);
    return (<typeof _exec>require("child_process").exec)(command, options, (e, stdout, stderr) => {
        if (e) {
            error(e);
            endAsync(taskId);
            return;
        }
        stdout && log(stdout);
        stderr && error(stderr);
        endAsync(taskId);
    });
}

/**
 * 执行一个命令行程序。
 * @param command 要执行的命令行。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @return 返回子进程输出的内容。
 */
export function execSync(command: string, options?: ExecOptionsWithStringEncoding) {
    const taskId = beginAsync(command);
    try {
        const output = (<typeof _execSync>require("child_process").execSync)(command, options);
        output && log(output);
        return output;
    } finally {
        endAsync(taskId);
    }
}
