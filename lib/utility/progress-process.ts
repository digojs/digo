/**
 * @fileOverview 进度条子进程
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { ellipsisLog, formatLog } from "../utility/log";

/**
 * 存储当前存储显示的进度条样式。
 */
var progressStyle: 0 | 1 | 2 | 3 | 4 = 0;

/**
 * 存储当前要显示的进度条文案。
 */
var progressContent = "";

/**
 * 存储当前进度条计时器。
 */
var progressTimer: NodeJS.Timer;

/**
 * 表示一个信息包。
 */
export interface Message {

    /**
     * 获取当前信息是否是错误。
     */
    error: boolean;

    /**
     * 获取当前信息的数据。
     */
    data: any;

    /**
     * 获取当前信息的编码。
     */
    encoding: string;

}

// 驱动更新进度条。
process.on('message', (message: null | string | Message) => {

    // post(null): 清除进度条。
    if (!message) {
        progressContent = "";
        clearInterval(progressTimer);
        progressTimer = null;
        progressStyle = 0;
        process.stdout.write('\u001b[0J', () => {
            process.exit();
        });
        return;
    }

    // post("msg"): 更新进度条信息。
    if (typeof message === "string") {
        progressContent = message;
        if (!progressTimer) {
            progressTimer = setInterval(printProgress, 100);
            printProgress();
        }
        return;
    }

    // post({...}): 显示其它信息。
    process.stdout.write('\u001b[0J');

    // 输出当前内容。
    if (message.error) {
        process.stderr.write(message.data, message.encoding);
    } else {
        process.stdout.write(message.data, message.encoding);
    }

    // 重新打印进度条。
    if (progressStyle) {
        printProgress();
    }

});

/**
 * 打印进度条。
 */
function printProgress() {

    let finalContent = ellipsisLog(progressContent, -3);

    // 更新滑块样式。
    switch (progressStyle) {
        case 1:
            var styleChar = "-";
            progressStyle = 2;
            break;
        case 2:
            var styleChar = "\\";
            progressStyle = 3;
            break;
        case 3:
            var styleChar = "|";
            progressStyle = 4;
            break;
        case 4:
            var styleChar = "|";
            progressStyle = 1;
            break;
        default:
            var styleChar = "-";
            progressStyle = 2;
            break;
    }

    process.stdout.write(`\u001b[0J\u001b[90m${styleChar}\u001b[39m ${ellipsisLog(progressContent, -3)}\u001b[1G`);

}
