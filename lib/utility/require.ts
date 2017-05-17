import * as np from "path";

/**
 * 允许 require 从指定的文件夹载入模块。
 * @param paths 要载入的模块所在文件夹路径。
 */
export function addRequirePath(...paths: string[]) {
    for (let i = 0; i < paths.length; i++) {
        paths[i] = np.resolve(paths[i]);
    }
    const Module = require("module").Module;
    const oldResolveLookupPaths = Module._resolveLookupPaths;
    Module._resolveLookupPaths = function (request: string, parent: any) {
        const result: [string, string[]] = oldResolveLookupPaths.apply(this, arguments);
        // 仅当请求全局模块时，追加全局搜索路径。
        if (!/^[\.\/\\]|:/.test(request) && !np.isAbsolute(request)) {
            for (const path of paths) {
                if (result[1].indexOf(path) < 0) {
                    result[1].push(path);
                }
            }
        }
        return result;
    };
}

/**
 * 解析指定模块的绝对路径。
 * @param module 要解析的模块路径。
 * @return 返回已解析的模块绝对路径。如果找不到模块则返回 undefined。
 */
export function resolveRequirePath(module: string) {
    if (/^[\.\/\\]|:/.test(module)) {
        try {
            return require.resolve(np.resolve(module));
        } catch (e) { }
    } else {
        let dir = process.cwd();
        let prevDir: string;
        do {
            try {
                return require.resolve(np.resolve(dir, "node_modules", module));
            } catch (e) { }
            prevDir = dir;
            dir = np.dirname(dir);
        } while (dir.length !== prevDir.length);
    }
}
