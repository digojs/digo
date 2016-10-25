/**
 * @fileOverview digo
 * @author xuld <xuld@vip.qq.com>
 */
export * from "./utility/object";
export * from "./utility/date";
export * from "./utility/encode";
export * from "./utility/crypto";
export * from "./utility/path";
export * from "./utility/url";
export * from "./utility/fs";
export * from "./utility/fsSync";
export * from "./utility/watcher";
export * from "./utility/matcher";
export * from "./utility/glob";
export * from "./utility/globSync";
export * from "./utility/queue";
export * from "./utility/asyncQueue";
export * from "./utility/progressBar";
export * from "./utility/log";
export * from "./utility/sourceMap";
export * from "./utility/location";
export * from "./utility/requireHelper";

export * from "./builder/logging";
export * from "./builder/then";
export * from "./builder/progress";
export * from "./builder/file";
export * from "./builder/writer";
export * from "./builder/plugin";
export * from "./builder/fileList";
export * from "./builder/src";
export * from "./builder/watch";
export * from "./builder/create";
export * from "./builder/exec";
export * from "./builder/config";
export * from "./builder/run";

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
