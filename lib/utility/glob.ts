/**
 * @fileOverview 通配符
 * @author xuld <xuld@vip.qq.com>
 */
import * as path from "path";
import { Matcher, Pattern, CompiledPattern } from "./matcher";
import { walk } from "./fs";
import { WalkOptions, Stats } from "./fsSync";
import { GlobOptions } from "./globSync";

/**
 * 异步搜索指定通配符匹配的文件。
 * @param pattern 要搜索的模式或匹配器。
 * @param options 相关的选项。
 */
export function glob(pattern: Pattern | Matcher, options: GlobOptions) {
    const matcher = pattern instanceof Matcher ? pattern : new Matcher(pattern, options.cwd);
    const processed: { [path: string]: boolean } = { __proto__: null };
    let pending = 0;
    for (const compiledPattern of (matcher.compiledPatterns.length ? matcher.compiledPatterns : [{
        base: path.resolve(options.cwd || "."),
        test(path) { return true; }
    }])) {
        pending++;
        walk(compiledPattern.base, {
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
            error: options.error,
            end() {
                if (--pending > 0) return;
                options.end && options.end();
            }
        });
        options.walk && options.walk(compiledPattern.base);
    }

}
