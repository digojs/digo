/**
 * @fileOverview 查找文件
 * @author xuld <xuld@vip.qq.com>
 */
import { Matcher, Pattern } from "../utility/matcher";
import { glob } from "../utility/glob";
import { resolvePath, relativePath, isAbsolutePath } from "../utility/path";
import { verbose, error } from "./logging";
import { beginAsync, endAsync } from "./then";
import { FileList } from "./fileList";
import { File } from "./file";
import { watcher } from "./watch";

/**
 * 获取全局匹配器。
 */
export var matcher = new Matcher().addIgnore(".*");

var needClearCache = true;
var statsCache = {};
var entriesCache = {};

function clearCache() {
    statsCache = {};
    entriesCache = {};
    needClearCache = true;
}

/**
 * 筛选指定的文件并返回一个文件列表。
 * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上组合的数组。
 * @returns 返回一个文件列表对象。
 */
export function src(...patterns: Pattern[]) {
    // 遍历匹配 patterns 的文件要注意：
    // 1. 如果设置了 matchedFiles，则直接从 matchedFiles 找出匹配的文件。
    // 2. 应用全局的 matcher 配置。
    // 3. 监听模式下需要监听基路径。
    // 4. 此函数执行次数多，应保证较高的效率。
    // 5. patterns 可用于决定所有文件发布后的基路径。如 ["src/*.jpg", "src/*.png"] 的基路径是 "src"。

    const taskId = beginAsync("Search Files...");

    const result = new FileList();
    const currentMatcher = new Matcher(patterns);
    const base = currentMatcher.base;

    function match(path: string) {
        result.add(new File(path, base));
    }

    // 监听模式下只处理改动的文件。
    if (watcher && watcher.changedFiles.length) {
        for (const path of watcher.changedFiles) {
            if (currentMatcher.test(path) && matcher.test(path)) {
                match(path);
            }
        }
        result.end();
        endAsync(taskId);
    } else {

        // 在下桢清理缓存。
        if (needClearCache) {
            needClearCache = false;
            process.nextTick(clearCache);
        }

        glob(currentMatcher, {
            statsCache,
            entriesCache,
            ignored(path, global) {
                verbose(global ? "Global Ignored: {path}" : "Ignored: {path}", { path });
            },
            match,
            end() {
                result.end();
                endAsync(taskId);
            },
            walk: watcher && (path => {
                watcher.add(path)
            })
        });

    }

    return result;
}
