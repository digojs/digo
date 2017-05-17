declare var __export: any;
if (typeof (global as any).digo === "object") {
    module.exports = (global as any).digo;
    __export = require = function () { } as any;
} else {
    (global as any).digo = module.exports;
    __export = (module: any) => {
        for (const key in module) {
            if (!exports.hasOwnProperty(key)) {
                if (typeof module[key] === "function") {
                    exports[key] = module[key];
                } else {
                    Object.defineProperty(exports, key, {
                        get() { return module[key]; },
                        set(value) { return module[key] = value; }
                    });
                }
            }
        }
        if (module.__esModule && "default" in module) {
            delete exports.default;
        }
    };
}

export * from "./utility/lang";
export * from "./utility/encode";
export * from "./utility/crypto";
export * from "./utility/path";
export * from "./utility/url";
export * from "./utility/fs";
export * from "./utility/fsWatcher";
export * from "./utility/matcher";
export * from "./utility/glob";
export * from "./utility/queue";
export * from "./utility/asyncQueue";
export * from "./utility/log";
export * from "./utility/statusBar";
export * from "./utility/sourceMap";
export * from "./utility/location";
export * from "./utility/require";
export * from "./utility/commandLine";

export * from "./builder/events";
export * from "./builder/logging";
export * from "./builder/progress";
export * from "./builder/async";
export * from "./builder/plugin";
export * from "./builder/exec";
export * from "./builder/file";
export * from "./builder/writer";
export * from "./builder/fileList";
export * from "./builder/src";
export * from "./builder/watch";
export * from "./builder/server";
export * from "./builder/init";
export * from "./builder/run";
export * from "./builder/config";
