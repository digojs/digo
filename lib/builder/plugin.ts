/**
 * @fileOverview 插件
 * @author xuld <xuld@vip.qq.com>
 */
import { resolvePath } from "../utility/path";
import { beginAsync, endAsync } from "./then";

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
    const taskId = beginAsync("Load plugin: {plugin}", { plugin: name });

    const Module = require("module").Module;
    const targetModule = new Module(resolvePath('digo.config.js'), module);

    try {
        return plugins[name] = targetModule.require(name);
    } catch (e) {
        if (/^[\.\/\\]|^\w+\:/.test(name)) {
            throw new Error(`Cannot find plugin '${name}'.`);
        }

        try {
            return plugins[name] = require(name);
        } catch (e) {
            throw new Error(`Cannot find plugin '${name}'. Use 'npm install ${name}' to install it.`);
        }
    } finally {
        endAsync(taskId);
    }

}
