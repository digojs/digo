/**
 * @fileOverview 进度条
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { fork, ChildProcess } from "child_process";

import { formatLog } from "../utility/log";
import { taskCount, pendingTaskCount } from "./async";

/**
 * 获取或设置是否在控制台显示进度条。
 */
export var progress = !!(<boolean | void>(<WriteStream>process.stdout).isTTY);

var progressProcess: ChildProcess;

/**
 * 更新进度条。
 * @param message 要显示的消息。如果为 null 则清空进度条。
 */
export function updateProgress(message: string) {

    // 禁用进度条。
    if (!progress) return;

    /**
     * process.stdout 的原型类型。
     */
    type ProcessStdoutType = { __proto__?: typeof process.stdout };

    if (!message) {
        progressProcess.send(null);
        return;
    }

    if (!progressProcess) {
        progressProcess = fork(require.resolve("../utility/progress-process"));
        process.stdout.write = function writeBound(message, encoding?, cb?) {
            return progressProcess.send({ error: false, data: message, encoding: encoding }, cb);
        };
        process.stderr.write = function writeBound(message, encoding?, cb?) {
            return progressProcess.send({ error: true, data: message, encoding: encoding }, cb);
        };
        progressProcess.on("exit", () => {
            process.stdout.write = (<ProcessStdoutType>process.stdout).__proto__.write;
            process.stderr.write = (<ProcessStdoutType>process.stderr).__proto__.write;
            progressProcess = null;
        });
    }

    progressProcess.send(`(\u001b[36m${(taskCount - pendingTaskCount) + "/" + (taskCount + 1)}\u001b[39m) ${message}`);
}
