/**
 * @fileOverview 查找文件
 * @author xuld <xuld@vip.qq.com>
 */
import { Matcher, Pattern, getGlobDir, Tester, isGlob } from "../utility/matcher";
import { Stats, walkDir } from "../utility/fs";
import { WalkDirCallbacks } from "../utility/fs-sync";
import { getFileName, relativePath } from "../utility/path";
import { verbose, error } from "./logging";
import { FileList } from "./fileList";
import { File } from "./file";
import { cache, checkCache } from "./cache";
import { watcher } from "./watch";

/**
 * 获取全局匹配器。
 */
export var matcher = new Matcher;

/**
 * 当前待处理的文件列表。
 */
export var matchedFiles: string[] = [];

var statsCache = {};
var entriesCache = {};

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

    const result = new FileList();
    const currentMatcher = new Matcher(patterns);

    const added: { [key: string]: boolean; } = { __proto__: null };
    function addFile(srcName: string, destName: string) {
        if (srcName in added) { return; }
        if (!matcher.test(srcName)) {
            added[srcName] = false;
            verbose("Global Ignored: {path}", { path: srcName });
            return;
        }
        added[srcName] = false;
        result.add(new File(srcName, destName));
    }

    // 如果只处理选中的文件，则只需筛选一遍文件。
    if (matchedFiles.length) {
        for (const name of matchedFiles) {
            const matchResult = currentMatcher.match(name);
            if (matchResult != null) {
                addFile(name, matchResult);
            }
        }
        result.end();
    } else {
        let pending = 1;
        for (let i = 0; i < currentMatcher.patterns.length; i++) {
            const pattern = currentMatcher.patterns[i];

            // "file.js": 固定一个文件。
            if (pattern.glob && !isGlob(pattern.glob)) {
                addFile(pattern.glob, getFileName(pattern.glob));
                if (watcher) watcher.add(pattern.glob);
                continue;
            }

            // 遍历文件夹。
            pending++;
            const dir = getGlobDir(pattern.glob) || ".";
            walkDir(getGlobDir(pattern.glob) || ".", {
                file(path) {
                    const name = relativePath(path);
                    if (!pattern.test(name)) {
                        return;
                    }
                    if (currentMatcher.ignore(name)) {
                        verbose("Ignored: {path}", { path: name });
                        return;
                    }
                    //   addFile(name, )
                },
                dir(path) {
                    const name = relativePath(path);
                    if (currentMatcher.ignore(name)) {
                        verbose("Ignored: {path}", { path: name });
                        return false;
                    }
                    if (matcher.ignore(name)) {
                        verbose("Global Ignored: {path}", { path: name });
                        return false;
                    }
                },
                end() {
                    if (--pending <= 0) result.end();
                }
            });

            if (watcher) watcher.add(dir);
        }
        if (--pending <= 0) result.end();
    }
    return result;
}
