/**
 * @fileOverview 加载模块
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";

/**
 * 允许从指定的文件夹载入全局模块。
 * @param path 要载入的全局路径。
 */
export function addGlobalPath(path: string) {
    const Module = require("module").Module;
    const oldResolveLookupPaths = Module._resolveLookupPaths;
    Module._resolveLookupPaths = function (request, parent) {
        const result = oldResolveLookupPaths.apply(this, arguments);
        // 如果请求的模块是全局模块，则追加全局搜索路径。
        if (result[1].indexOf(path) < 0 && !/^[\.\\\/]/.test(request) && !np.isAbsolute(request)) {
            result[1].push(path);
        }
        return result;
    };
}
