/**
 * @fileOverview 导入主文件
 * @author xuld <xuld@vip.qq.com>
 */
export * from "./utility/object";
export * from "./utility/date";
export * from "./utility/encode";
export * from "./utility/crypto";
export * from "./utility/path";
export * from "./utility/url";
export * from "./utility/fs";
export * from "./utility/fs-sync";
export * from "./utility/watcher";
export * from "./utility/log";
export * from "./utility/sourceMap";
export * from "./utility/matcher";

export * from "./builder/logging";
export * from "./builder/progress";
export * from "./builder/async";
export * from "./builder/plugin";
export * from "./builder/exec";

export * from "./builder/src";
export * from "./builder/file";
export * from "./builder/fileList";

export * from "./builder/watch";
export * from "./builder/cli";
export * from "./builder/cache";

export * from "./builder/config";

// 重写默认的 __export 函数以便可以重新导出数据。
function __export(m) {
    for (let p in m) {
        if (!exports.hasOwnProperty(p)) {
            if (typeof m[p] === "function") {
                exports[p] = m[p];
            } else {
                Object.defineProperty(exports, p, {
                    get() { return m[p]; },
                    set(value) { return m[p] = value; }
                });
            }
        }
    }
}
