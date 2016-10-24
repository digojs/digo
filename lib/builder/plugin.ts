/**
 * @fileOverview 插件
 * @author xuld <xuld@vip.qq.com>
 */
import { resolvePath, getDir } from "../utility/path";
import { fatal } from "./logging";
import { begin, end } from "./progress";

/**
 * 存储所有已载入的插件对象。
 */
const plugins: { [name: string]: any } = { __proto__: null };

/**
 * 尝试载入指定的插件。
 * @param name 要载入的插件名。
 * @returns 返回插件导出对象。
 */
export function plugin(name: string) {
    const loaded = plugins[name];
    if (loaded) {
        return loaded;
    }
    const taskId = begin("Load plugin: {plugin}", { plugin: name });

    // 搜索插件实际位置。
    const isRelative = /^[\.\/\\]|^\w+\:/.test(name);
    try {
        if (isRelative) {
            name = require.resolve(resolvePath(name));
        } else {
            let dir = process.cwd();
            do {
                try {
                    name = require.resolve(resolvePath(dir + "/node_modules", name));
                    break;
                } catch (e3) { }
                var prevDir = dir;
                dir = getDir(dir);
            } while (dir.length !== prevDir.length);
        }
    } catch (e) {
        try {
            name = require.resolve(name);
        } catch (e2) {
            end(taskId);
            fatal(isRelative ? "Cannot find plugin '{plugin}'." : "Cannot find plugin '{plugin}'. Use 'npm install {default:plugin}' to install it.", { plugin: name });
        }
    }

    // 加载插件。
    try {
        return plugins[name] = require(name);
    } finally {
        end(taskId);
    }

}
