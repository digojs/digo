import * as path from "path";
import { Stats, walk, WalkOptions } from "./fs";
import { Matcher, Pattern } from "./matcher";

/**
 * 搜索指定通配符匹配的文件。
 * @param pattern 要搜索的模式或匹配器。
 * @param options 相关的选项。
 * @return 如果是同步模式则返回所有文件列表。
 */
export function glob(pattern: Pattern, options: GlobOptions & { end(files: string[]): void; }): void;

/**
 * 搜索指定通配符匹配的文件。
 * @param pattern 要搜索的模式或匹配器。
 * @param options 相关的选项。
 * @return 如果是同步模式则返回所有文件列表。
 */
export function glob(pattern: Pattern, options?: GlobOptions): string[];

export function glob(pattern: Pattern, options: GlobOptions = {}) {
    const matcher = pattern instanceof Matcher ? pattern : new Matcher(pattern, options.cwd);
    const processed: { [path: string]: boolean } = { __proto__: null! };
    let pending = 0;
    for (const compiledPattern of (matcher.patterns.length ? matcher.patterns : [{
        base: path.resolve(options.cwd || "."),
        test(path: string) { return true; }
    }])) {
        pending++;
        walk(compiledPattern.base, {
            stats: options.stats,
            entries: options.entries,
            error: options.error,
            walk: options.walk,
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

                // 自定义处理器。
                if (options.dir && options.dir(path, stats) === false) {
                    return false;
                }

            },
            file(path, stats) {

                // 不重复处理相同的文件；检查是否被当前模式匹配。
                if (path in processed || !compiledPattern.test(path)) {
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
                options.file && options.file(path, stats);

            },
            end: options.end ? () => {
                if (--pending < 1) {
                    if (options.end!.length > 0) {
                        (options.end as any)(Object.keys(processed));
                    } else {
                        options.end!();
                    }
                }
            } : undefined
        });
    }
    if (!options.end) {
        return Object.keys(processed);
    }
}

export default glob;

/**
 * 表示搜索通配符的选项。
 */
export interface GlobOptions extends WalkOptions {

    /**
     * 搜索的根路径。
     */
    cwd?: string;

    /**
     * 全局匹配器。如果设置了全局匹配器，则返回当前匹配器和全局匹配器的交集。
     */
    globalMatcher?: Matcher;

    /**
     * 当忽略一个文件或文件夹时执行。
     * @param path 当前相关的路径。
     * @param stats 当前文件的属性。
     * @param global 如果为 true 则表示被全局匹配器忽略。
     */
    ignored?(path: string, stats: Stats, global: boolean): void;

}
