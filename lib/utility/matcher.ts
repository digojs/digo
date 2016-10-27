/**
 * @fileOverview 匹配器
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import { commonDir, relativePath } from "./path";

/**
 * 表示一个匹配器。
 */
export class Matcher {

    /**
     * 获取所有已编译的模式列表。
     */
    patterns: CompiledPattern[] = [];

    /**
     * 获取当前匹配器的忽略匹配器。如果不存在则返回 undefined。
     */
    ignoreMatcher: Matcher;

    /**
     * 初始化新的匹配器。
     * @param pattern 要添加的匹配模式。
     * @param cwd 模式的根路径。默认当前当前工作目录。
     */
    constructor(pattern?: Pattern, cwd?: string) {
        pattern && this.add(pattern, cwd);
    }

    /**
     * 添加一个匹配模式。
     * @param pattern 要添加的匹配模式。
     * @param cwd 模式的根路径。默认当前当前工作目录。
     */
    add(pattern: Pattern, cwd?: string) {
        if (typeof pattern === "string") {
            if (pattern.charCodeAt(0) === 33/*!*/) {
                (this.ignoreMatcher || (this.ignoreMatcher = new Matcher)).patterns.push(globToRegExp(pattern.substr(1), cwd));
            } else {
                this.patterns.push(globToRegExp(pattern, cwd));
            }
        } else if (Array.isArray(pattern)) {
            for (const p of pattern) {
                this.add(p, cwd);
            }
        } else if (pattern instanceof RegExp) {
            this.patterns.push({
                base: normalizeBase(cwd),
                test(path) {
                    return (<RegExp>pattern).test(relativePath(this.base, path));
                }
            });
        } else if (typeof pattern === "function") {
            this.patterns.push({
                base: normalizeBase(cwd),
                test: pattern
            });
        } else if (pattern instanceof Matcher) {
            this.patterns.push(...pattern.patterns);
            if (pattern.ignoreMatcher) {
                (this.ignoreMatcher || (this.ignoreMatcher = new Matcher)).add(pattern.ignoreMatcher, cwd);
            }
        }
        return this;
    }

    /**
     * 添加一个忽略模式。
     * @param pattern 要添加的模式。
     */
    addIgnore(pattern: Pattern) {
        (this.ignoreMatcher || (this.ignoreMatcher = new Matcher)).add(pattern);
        return this;
    }

    /**
     * 测试指定的绝对路径是否符合当前匹配器。
     * @param path 要测试的绝对路径。
     * @returns 如果匹配任意一个已添加的模式且未被忽略则返回 true，否则返回 false。
     */
    test(path: string): boolean {
        end: if (this.patterns.length) {
            for (const pattern of this.patterns) {
                if (pattern.test(path)) {
                    break end;
                }
            }
            return false;
        }
        return !this.ignoreMatcher || !this.ignoreMatcher.test(path);
    }

    /**
     * 获取所有模式的公共基路径。
     * @returns 返回基路径部分(末尾含分隔符)。如果模式为空则返回当前目录。
     */
    get base() {
        if (!this.patterns.length) {
            return process.cwd() + np.sep;
        }
        let result: string;
        for (const compiledPattern of this.patterns) {
            result = result == undefined ? compiledPattern.base : commonDir(result, compiledPattern.base);
        }
        return result;
    }

}

/**
 * 表示一个模式。可以是通配符、正则表达式、测试函数或以上模式组成的数组。
 * @remark
 * ##### 通配符
 * 通配符的语法和 [`.gitignore`](https://git-scm.com/docs/gitignore) 相同，
 * 支持以下特殊字符：
 * - `*`: 匹配任意个字符（/ 除外)。
 * - `**`:匹配任意个字符。
 * - `?`: 匹配一个字符(/ 除外)。
 * - `\`: 表示转义字符。
 * - `[abc]`: 匹配括号中的任一个字符。
 * - `[^abc]`: 匹配括号中的任一个字符以外的字符。
 * 
 * 在通配符前面加 `!`，表示忽略匹配的项。
 * 注意如果忽略了父文件夹，出于性能考虑，无法重新包含其中的子文件。
 * 
 * 如果通配符以 `/` 结尾，表示只匹配文件夹。
 * 
 * 关于 `*` 和 `**` 的区别：
 * - `*` 只匹配一层目录。比如 `usr/*\/foo.js` 匹配 `usr/dir/foo.js`，但不匹配 `usr/foo.js`，也不匹配 `usr/dir/sub/foo.js`。
 * - `**` 匹配任意层目录(包括没有)。比如 `usr/**\/foo.js` 既匹配 `usr/dir/foo.js`，也匹配 `usr/foo.js` 和 `usr/dir/sub/foo.js`。
 * - 特殊情况：如果通配符不含 /(末尾除外)，则两者意义相同：都表示匹配任意层目录。比如 `*.js` 既匹配 `foo.js` 也匹配 `usr/foo.js`。如果希望只匹配根目录下的文件，应该写成 `/*.js`。
 *
 * ##### 正则表达式
 * 复杂的匹配规则可以使用正则表达式。
 * 测试的源是一个固定以 / 为分隔符的相对路径。
 *
 * ##### 自定义函数
 * 函数接收一个绝对路径为参数，如果函数返回 true 表示匹配该路径。
 * ```js
 * function match(path) {
 *     return path.endsWith(".js");
 * }
 * ```
 */
export type Pattern = string | RegExp | ((path: string) => boolean) | any[] | Matcher;

/**
 * 表示一个已编译的模式。
 */
export interface CompiledPattern {

    /**
     * 获取基路径(末尾含分隔符)。
     */
    base: string;

    /**
     * 测试是否匹配指定的路径。
     * @param path 要测试的绝对路径。
     * @returns 如果匹配则返回 true，否则返回 false。
     */
    test(path: string): boolean;

}

const compiledPatterns: { [pattern: string]: CompiledPattern & { cwd: string }; } = { __proto__: null };

/**
 * 将指定的通配符转为等价的正则表达式。
 * @param pattern 要处理的通配符。
 * @param cwd 所有路径的基路径。
 * @param matchBase 是否允许匹配基路径。默认为 true。
 * @return 返回已编译的正则表达式。
 */
function globToRegExp(pattern: string, cwd: string, matchBase?: boolean) {
    cwd = cwd || process.cwd();
    const cache = compiledPatterns[pattern];
    if (cache && cache.cwd === cwd) {
        return cache;
    }

    let glob = np.posix.normalize(pattern);
    let root = normalizeBase(cwd);

    // 提取通配符的基路径。
    let base: string;
    const firstGlob = glob.search(/[*?\\]|\[.+\]/);
    const match = /^\/?((?:[^\/]+\/)+)/.exec(firstGlob >= 0 ? glob.substr(0, firstGlob) : glob);
    if (match) {
        root = np.join(root, match[1]);
        base = firstGlob >= 0 ? root : np.join(root, glob.substr(match[0].length));
        glob = glob.substr(match[0].length - 1); // 保留通配符的 / 前缀以便后续正确处理 /。
    } else {
        base = root;
    }

    // 剩余部分转为正则表达式。
    let hasSlash = matchBase === false;
    let hasSlashPostfix: boolean;
    let regex = glob.replace(/\\.|\[.+\]|\*\*\/?|[*?\-+.^|\\{}()[\]/]/g, (all: string, index: number) => {
        switch (all.charCodeAt(0)) {
            case 47/*/*/:
                if (index === 0) {
                    hasSlash = true;
                    if (index === glob.length - 1) {
                        hasSlashPostfix = true;
                    }
                    return "";
                }
                if (index === glob.length - 1) {
                    hasSlashPostfix = true;
                } else {
                    hasSlash = true;
                }
                return sep;
            case 42/***/:
                return all.length > 2 ? `(.*${sep})?` : all.length > 1 ? "(.*)" : `([^${sep}]*)`;
            case 63/*?*/:
                return `([^${sep}])`;
            case 92/*\*/:
                return index === pattern.length - 1 ? " " : escapeRegExp(all.charAt(1));
            case 91/*[*/:
                if (all.length > 2) {
                    index = all.charCodeAt(1) === 94/*^*/ ? 2 : 1;
                    return (index === 1 ? '[' : '[^') + escapeRegExp(all.substring(index, all.length - 1)) + ']';
                }
            // fall through
            default:
                return "\\" + all;
        }
    });

    // 如果不存在 /(末尾除外)，则允许匹配任意位置。
    regex = (hasSlash ? "^" + escapeRegExp(root) : `(?:^|${sep})`) + regex;

    // 如果末尾不存在 /，则必须匹配到结尾或文件夹结尾。
    if (!hasSlashPostfix) regex += `(?:$|${sep})`;

    // 生成正则表达式。
    const result: CompiledPattern & { cwd: string } = compiledPatterns[pattern] = <any>new RegExp(regex, np.sep === "\\" ? "i" : "");
    result.cwd = cwd;
    result.base = base;
    return result;
}

const sep = escapeRegExp(np.sep);

/**
 * 编码字符串里的正则表达式特殊字符。
 * @param pattern 要处理的通配符。
 * @return 返回处理后的模式字符串。
 */
function escapeRegExp(pattern: string) {
    return pattern.replace(/[-+.^$?*|\\{}()[\]]/g, "\\$&");
}

/**
 * 规范化基路径。
 * @param path 要处理的路径。
 * @return 返回已处理的基路径(末尾含分隔符)。
 */
function normalizeBase(path: string) {
    path = np.resolve(path || "");
    if (!path.endsWith(np.sep)) path += np.sep;
    return path;
}
