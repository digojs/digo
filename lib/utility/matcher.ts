/**
 * @fileOverview 匹配器
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import { commonDir, relativePath, resolvePath } from "./path";

/**
 * 表示一个通配符。
 * @remark
 * 通配符的语法同 [`.gitignore`](https://git-scm.com/docs/gitignore)。
 * 通配符中可以使用以下特殊字符：
 * - `*`: 匹配任意个字符（/ 除外)。
 * - `**`:匹配任意个字符。
 * - `?`: 匹配一个字符(/ 除外)。
 * - `\`: 表示转义字符。
 * - `[abc]`: 匹配括号中的任一个字符。
 * - `[^abc]`: 匹配括号中的任一个字符以外的字符。
 * 如果通配符以 ! 开头，表示排除当前通配符匹配的项。注意如果排除了父文件夹，出于性能考虑，无法重新包含其中的子文件。
 * 如果通配符以 / 结尾，表示必须匹配目录名。
 * 默认通配符必须匹配完整路径，如果通配符不含 /(末尾除外)，则允许只匹配基路径，即 *.js 等效于 **\/*.js。
 */
export type Glob = string;

/**
 * 表示一个测试函数。
 * @param value 要测试的字符串。
 * @returns 如果测试成功则返回 true，否则返回 false。
 * @example function test(value) { return value.indexOf("abc/") >= 0; }
 */
export type Tester = (value: string) => boolean;

/**
 * 表示一个通配符、正则表达式、测试函数或以上模式组成的数组。
 */
export type Pattern = Glob | RegExp | Tester | any[];

/**
 * 表示一个匹配器。
 */
export class Matcher {

    /**
     * 获取所有模式列表。
     */
    patterns: CompiledPattern[] = [];

    /**
     * 获取当前匹配器的忽略匹配器。
     */
    ignoreMatcher: Matcher;

    /**
     * 初始化新的匹配器。
     * @param pattern 要添加的模式。
     */
    constructor(pattern?: Pattern) {
        pattern && this.add(pattern);
    }

    /**
     * 添加一个模式。
     * @param pattern 要添加的模式。
     */
    add(pattern: Pattern) {
        if (typeof pattern === "string") {
            if (pattern.charCodeAt(0) === 33/*!*/) {
                (this.ignoreMatcher || (this.ignoreMatcher = new Matcher)).patterns.push(globToRegExp(pattern.substr(1)));
            } else {
                this.patterns.push(globToRegExp(pattern));
            }
        } else if (Array.isArray(pattern)) {
            for (const p of pattern) {
                this.add(p);
            }
        } else if (pattern instanceof RegExp) {
            this.patterns.push(pattern);
        } else if (typeof pattern === "function") {
            this.patterns.push({ test: pattern });
        }
        delete this._dir;
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
     * 匹配指定的字符串。
     * @param value 要测试的字符串。
     * @returns 返回匹配结果路径。如果不匹配则返回 null。
     * @example new Matcher("src/*.jpg").match("src/a.jpg") // "a.jpg"
     * @example new Matcher("src/a/*.jpg", "src/b/*.jpg").match("src/a/1.jpg") // "a/1.jpg"
     */
    match(value: string) {
        if (!this.patterns.length) {
            return value;
        }
        for (const pattern of this.patterns) {
            if (pattern.test(value)) {
                if (!this.dir) {
                    return value.substr(getGlobDir(pattern.glob).length) || ".";
                }
                return relativePath(this.dir, value);
            }
        }
        return null;
    }

    /**
     * 判断指定的字符串是否被忽略。
     * @param value 要测试的字符串。
     * @returns 如果忽略则返回 true，否则返回 false。
     */
    ignore(value: string) { return this.ignoreMatcher ? this.ignoreMatcher.test(value) : false; }

    /**
     * 测试指定的字符串是否被匹配且未被忽略。
     * @param value 要测试的字符串。
     * @returns 如果匹配且未被忽略则返回 true，否则返回 false。
     */
    test(value: string) {
        if (this.patterns.length) {
            for (const pattern of this.patterns) {
                if (pattern.test(value)) {
                    return !this.ignore(value);
                }
            }
            return false;
        }
        return !this.ignore(value);
    }

    /**
     * 存储所有模式的公共文件夹。
     */
    private _dir: string;

    /**
     * 获取所有模式的公共文件夹。
     */
    get dir() {
        if (this._dir != undefined) {
            return this._dir;
        }
        let result: string;
        for (const pattern of this.patterns) {
            const dir = getGlobDir(pattern.glob);
            result = result == undefined ? resolvePath(dir) + np.sep : commonDir(result + "_", (dir || ".") + np.sep + "_");
        }
        return this._dir = result;
    }

}

/**
 * 表示一个已编译的模式表达式。
 */
interface CompiledPattern {

    /**
     * 测试是否匹配指定的字符串。
     * @param value 要测试的字符串。
     * @returns 如果匹配则返回 true，否则返回 false。
     */
    test(value: string): boolean;

    /**
     * 替换指定的输入并更新为目标。
     * @param value 要替换的字符串。
     * @param replacement 替换的目标。
     */
    replace?(value: string, replacement: string | Function): string;

    /**
     * 如果当前对象是通配符生成的，则返回源通配符。
     */
    glob?: Glob;

}

const compiledPatterns: { [key: string]: CompiledPattern; } = { __proto__: null };

/**
 * 将指定的通配符转为等效的正则表达式。
 * @param pattern 要处理的通配符。
 * @return 返回正则表达式。
 */
function globToRegExp(pattern: Glob) {
    const cache = compiledPatterns[pattern];
    if (cache) {
        return cache;
    }

    const normalized = np.posix.normalize(pattern);
    let matchRoot: boolean;
    let matchDir: boolean;

    // 替换通配符为等效的正则。
    let regex = normalized.replace(/\\.|\[.+\]|\*\*\/?|[*?\-+.^|\\{}()[\]/]/g, (all: string, index: number) => {
        switch (all.charCodeAt(0)) {
            case 47/*/*/:
                // 开头是 / 说明匹配根目录。
                if (index === 0) {
                    matchRoot = true;
                    return "";
                }

                // 末尾是 / 说明匹配目录名。
                if (index === pattern.length - 1) {
                    matchDir = true;
                    return all;
                }

                // 中间是 / 说明匹配完整路径。
                matchRoot = true;
                return all;
            case 42/***/:
                return all.length > 2 ? "(.*/)?" : all.length > 1 ? "(.*)" : "([^/]*)";
            case 63/*?*/:
                return "([^/])";
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

    // 追加前后缀。
    if (matchRoot) regex = "^" + regex;
    if (!matchDir) regex += "(?:$|/)";

    const result = compiledPatterns[pattern] = <CompiledPattern>new RegExp(regex, np.sep === "\\" ? "i" : "");
    result.glob = normalized;
    return result;
}

/**
 * 编码字符串里的正则表达式特殊字符。
 * @param pattern 要处理的通配符。
 * @return 返回处理后的模式字符串。
 */
function escapeRegExp(pattern: string) {
    return pattern.replace(/[-+.^$?*|\\{}()[\]]/g, "\\$&");
}

/**
 * 获取指定通配符的文件夹部分。
 * @param pattern 要处理的通配符。
 * @return 返回文件夹部分(含路径分隔符)。如果无文件夹部分则返回空字符串。
 */
export function getGlobDir(pattern: Glob) {
    if (!pattern) {
        return "";
    }
    const match = /^\/?([^*?\[\\]+\/)/.exec(pattern);
    if (match) {
        return match[1];
    }
    return "";
}

/**
 * 判断指定的字符串是否包含通配符。
 * @param pattern 要判断的通配符。
 * @returns 如果是通配符则返回 true，否则返回 false。
 */
export function isGlob(pattern: string) {
    return /[*?\[\\]/.test(pattern);
}
