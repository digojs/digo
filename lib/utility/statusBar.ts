import { ellipsisLog } from "./log";

/**
 * 存储当前的状态条样式。0 表示未显示，其它数值分别表示一个样式类型。
 */
var progressStyle = 0;

/**
 * 更新状态条内容。
 * @param message 要显示的信息。如果为空则清空状态条。
 */
export function updateStatus(message?: string | null) {

    // 清空状态条。
    if (!message) {
        progressStyle = 0;
        delete process.stdout.write;
        delete process.stderr.write;
        process.stdout.write("\u001b[0J");
        return;
    }

    // 更新滑块样式。
    let progressChar: string;
    switch (progressStyle) {
        case 1:
            progressChar = "-";
            progressStyle = 2;
            break;
        case 2:
            progressChar = "\\";
            progressStyle = 3;
            break;
        case 3:
            progressChar = "|";
            progressStyle = 4;
            break;
        case 4:
            progressChar = "|";
            progressStyle = 1;
            break;
        default:
            progressChar = "-";
            progressStyle = 2;
            process.stderr.write = process.stdout.write = function processBarWriteProxy() {
                (process.stdout as any).__proto__.write.call(process.stdout, "\u001b[0J");
                return (this as any).__proto__.write.apply(this, arguments);
            };
            break;
    }
    (process.stdout as any).__proto__.write.call(process.stdout, ellipsisLog(`\u001b[0J\u001b[90m${progressChar}\u001b[39m ${message}\u001b[1G`));
}

export default updateStatus;
