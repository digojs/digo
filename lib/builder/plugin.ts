/**
 * @fileOverview 插件
 * @author xuld <xuld@vip.qq.com>
 */
import { resolvePath } from "../utility/path";
import { beginAsync, endAsync } from "./async";

/**
 * 存储所有已载入的插件对象。
 */
const plugins: { [name: string]: any } = { __proto__: null };

/**
 * 尝试载入指定的插件。
 * @param name 要载入的插件名。
 * @returns 返回插件对应的处理器函数。
 */
export function plugin(name: string) {
    const loaded = plugins[name];
    if (loaded) {
        return loaded;
    }
    const taskId = beginAsync("Load plugin: {plugin}", { plugin: name });
    try {
        var pluginPath = require.resolve(resolvePath("node_modules/" + name));
    } catch (e) {
        try {
            var pluginPath = require.resolve(resolvePath("../../" + name));
        } catch (e) {
            try {
                var pluginPath = require.resolve(name);
            } catch (e) {
                throw new Error(`Cannot find plugin '{name}'. Use 'npm install {name}' to install it.`);
            } finally {
                endAsync(taskId);
            }
        }
    }

    try {
        return plugins[name] = require(pluginPath);
    } finally {
        endAsync(taskId);
    }
}
