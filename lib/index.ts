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
