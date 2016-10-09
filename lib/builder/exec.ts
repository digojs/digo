/**
 * @fileOverview 执行命令
 * @author xuld <xuld@vip.qq.com>
 */
import * as childProcess from "child_process";
import { beginAsync, endAsync } from "./then";
import { log, error } from "./logging";

/**
 * 异步执行一个命令行程序。
 * @param command 要执行的命令行。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @return 返回启动的子进程。
 */
export function exec(command: string, options?: childProcess.ExecOptions | childProcess.ExecOptionsWithStringEncoding | childProcess.ExecOptionsWithBufferEncoding | typeof callback, callback?: (exitCode: null | number) => void) {
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }
    const taskId = beginAsync(command);
    return childProcess.exec(command, options, (e, stdout, stderr) => {
        endAsync(taskId);
        if (stdout && stdout.length) {
            log(stdout.toString().trim());
        }
        if (stderr && stderr.length) {
            error(stderr.toString().trim());
        }
        if (e) {
            error(e);
        }
        callback && callback(e ? (<any>e).status : 0);
    });
}

/**
 * 执行一个命令行程序。
 * @param command 要执行的命令行。命令行参数以空格隔开。
 * @param options 执行相关参数。
 * @return 返回子进程的退出码。
 */
export function execSync(command: string, options?: childProcess.ExecOptions | childProcess.ExecOptionsWithStringEncoding | childProcess.ExecOptionsWithBufferEncoding): number | null {

    const taskId = beginAsync(command);
    try {
        options = options || {};
        options.shell = typeof options.shell === 'string' ? options.shell : <any>true;
        const ret = childProcess.spawnSync(command, options);
        if (ret.stdout && ret.stdout.length) {
            log(ret.stdout.toString().trim());
        }
        if (ret.stderr && ret.stderr.length) {
            error(ret.stderr.toString().trim());
        }
        if (ret.error) {
            error(ret.error);
        } else if (ret.status !== 0) {
            error("Command {command} exit with code {code}.", {
                command: (<any>ret).cmd || command,
                code: ret.status
            });
        }
        return ret.status;
    } finally {
        endAsync(taskId);
    }
}
