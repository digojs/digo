/**
 * @fileOverview 进度条
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { ellipsisLog, formatLog } from "./log";

/**
 * 存储当前的进度条样式。0 表示未显示，1 - 4 分别表示一种样式类别。
 */
var progressStyle = 0;

/**
 * 更新进度条。
 * @param message 要显示的消息。如果为 null 则清空进度条。
 */
export function updateProgressBar(message: string) {

    /**
     * process.stdout 的原型类型。
     */
    type ProcessStdoutType = { __proto__?: typeof process.stdout };

    // 清空进度条。
    if (!message) {
        progressStyle = 0;
        delete process.stdout.write;
        delete process.stderr.write;
        process.stdout.write("\u001b[0J");
        return;
    }

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
            process.stderr.write = process.stdout.write = function writeBound() {
                (<ProcessStdoutType>process.stdout).__proto__.write.call(process.stdout, "\u001b[0J");
                return (<ProcessStdoutType>this).__proto__.write.apply(this, arguments);
            };
            break;
    }
    (<ProcessStdoutType>process.stdout).__proto__.write.call(process.stdout, ellipsisLog(`\u001b[0J\u001b[90m${styleChar}\u001b[39m ${message}\u001b[1G`));
}
