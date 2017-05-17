import { resolveRequirePath } from "../utility/require";
import { fatal } from "./logging";
import { begin, end } from "./progress";

/**
 * 所有已载入的插件对象。
 */
const plugins: { [name: string]: any } = { __proto__: null! };

/**
 * 载入指定的插件。
 * @param name 要载入的插件名。
 * @return 返回插件导出对象。
 */
export function plugin(name: string) {
    const loaded = plugins[name];
    if (loaded) {
        return loaded;
    }
    const task = begin("Loading plugin: {bright:plugin}", { plugin: name });
    let path = resolveRequirePath(name);
    if (!path) {
        try {
            path = require.resolve(name);
        } catch (e) {
            end(task);
            fatal(/^[\.\/\\]|^\w+\:/.test(name) ? "Cannot find plugin '{bright:plugin}'." : "Cannot find plugin '{bright:plugin}'. Run 'npm install {plugin}' to install locally.", { plugin: name });
            return null;
        }
    }
    try {
        return plugins[name] = require(path);
    } finally {
        end(task);
    }
}
