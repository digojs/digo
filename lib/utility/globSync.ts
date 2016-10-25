/**
 * @fileOverview 通配符
 * @author xuld <xuld@vip.qq.com>
 */
import * as path from "path";
import { Matcher, Pattern } from "./matcher";
import { resolvePath } from "./path";
import { walkSync, WalkOptions, Stats } from "./fsSync";

/**
 * 异步搜索指定通配符匹配的文件。
 * @param pattern 要搜索的模式或匹配器。
 * @param options 相关的选项。
 * @return 返回匹配的所有文件。
 */
export function globSync(pattern: Pattern | Matcher, options?: GlobOptions) {
    options = options || {};
    const matcher = pattern instanceof Matcher ? pattern : new Matcher(pattern, options.cwd);
    const processed: { [path: string]: boolean } = { __proto__: null };
    for (const compiledPattern of (matcher.compiledPatterns.length ? matcher.compiledPatterns : [{
        base: path.resolve(options.cwd || "."),
        test(path) { return true; }
    }])) {
        walkSync(compiledPattern.base, {
            statsCache: options.statsCache,
            entriesCache: options.entriesCache,
            dir(path, stats) {

                // 检查是否被当前匹配器忽略。
                if (matcher.ignoreMatcher && matcher.ignoreMatcher.test(path)) {
                    options.ignored && options.ignored(path, stats, false);
                    return false;
                }

                // 检查是否被全局匹配器忽略。
                if (options.globalMatcher && options.globalMatcher.ignoreMatcher && options.globalMatcher.ignoreMatcher.test(path)) {
                    options.ignored && options.ignored(path, stats, true);
                    return false;
                }

            },
            file(path, stats) {

                // 不重复处理相同的文件。
                if (path in processed) {
                    return;
                }

                // 检查是否被当前模式匹配。
                if (!compiledPattern.test(path)) {
                    return;
                }

                // 检查是否被当前匹配器忽略。
                if (matcher.ignoreMatcher && matcher.ignoreMatcher.test(path)) {
                    return options.ignored && options.ignored(path, stats, false);
                }

                processed[path] = true;

                // 检查是否被全局匹配器忽略。
                if (options.globalMatcher && !options.globalMatcher.test(path)) {
                    return options.ignored && options.ignored(path, stats, true);
                }

                // 通知用户已匹配文件。
                options.match && options.match(path, stats);

            },
            error: options.error
        });
        options.walk && options.walk(compiledPattern.base);
    }
    options.end && options.end();

    return Object.keys(processed);
}

/**
 * 表示搜索通配符的选项。
 */
export interface GlobOptions {

    /**
     * 搜索的基路径。
     */
    cwd?: string;

    /**
     * 文件属性的缓存对象。
     */
    statsCache?: { [path: string]: null | Stats | ((path: string, error: NodeJS.ErrnoException, stats: Stats) => void)[]; };

    /**
     * 文件列表的缓存对象。
     */
    entriesCache?: { [path: string]: null | string[] | ((path: string, error: NodeJS.ErrnoException, entries: string[]) => void)[] };

    /**
     * 全局匹配器。如果设置了全局匹配器，则返回当前匹配器和全局匹配器的交集。
     */
    globalMatcher?: Matcher;

    /**
     * 当开始遍历目标文件夹或文件时执行。
     * @param path 当前相关的路径。
     */
    walk?(path: string): void;

    /**
     * 当忽略一个文件或文件夹时执行。
     * @param path 当前相关的路径。
     * @param stats 当前文件的属性。
     * @param global 如果为 true 则表示被全局匹配器忽略。
     */
    ignored?(path: string, stats: Stats, global: boolean): void;

    /**
     * 当匹配一个文件时执行。
     * @param path 当前相关的路径。
     * @param stats 当前文件的属性。
     */
    match?(path: string, stats: Stats): void;

    /**
     * 当出现错误时执行。
     * @param error 当前相关的错误。
     */
    error?(error: NodeJS.ErrnoException): void;

    /**
     * 当搜索结束时执行。
     */
    end?();

}