import { WriteStream } from "tty";

/**
 * 表示控制台颜色。
 * @see https://en.wikipedia.org/wiki/ANSI_escape_code
 */
export const enum ConsoleColor {

    /**
     * 黑色。
     */
    black = 30,

    /**
     * 红色。
     */
    red = 31,

    /**
     * 绿色。
     */
    green = 32,

    /**
     * 黄色。
     */
    yellow = 33,

    /**
     * 蓝色。
     */
    blue = 34,

    /**
     * 紫色。
     */
    magenta = 35,

    /**
     * 靛色。
     */
    cyan = 36,

    /**
     * 白色。
     */
    white = 37,

    /**
     * 亮色。
     */
    bright = 1,

    /**
     * 黑色。
     */
    brightBlack = 90,

    /**
     * 亮红色。
     */
    brightRed = 91,

    /**
     * 亮绿色。
     */
    brightGreen = 92,

    /**
     * 亮黄色。
     */
    brightYellow = 93,

    /**
     * 亮蓝色。
     */
    brightBlue = 94,

    /**
     * 亮紫色。
     */
    brightMagenta = 95,

    /**
     * 亮靛色。
     */
    brightCyan = 96,

    /**
     * 亮白色。
     */
    brightWhite = 97,

}

/**
 * 为日志字符串添加颜色控制字符。
 * @param value 要处理的字符串。
 * @param color 要添加的颜色。
 * @return 返回已处理的字符串。
 */
export function addLogColor(value: string, color: ConsoleColor) {
    return `\u001b[${color}m${value}\u001b[${color === ConsoleColor.bright ? 0 : 39}m`;
}

/**
 * 删除日志字符串中的所有控制字符。
 * @param value 要处理的字符串。
 * @return 返回已处理的字符串。
 */
export function removeLogColor(value: string) {
    return value.replace(controlRegex, "");
}

/**
 * 格式化指定的日志字符串。
 * @param value 要格式化的字符串。其中 `{x}` 会被替换为 `args.x` 的值；`{red:x}` 会被替换带颜色控制字符的值。其中可使用的颜色见 `ConsoleColor` 枚举。
 * @param args 格式化的参数。
 * @return 返回已处理的字符串。
 * @example formatLog("Hello, {bright:name}", {name: "xld"}) // "Hello, \x1b[1mxld\x1b[39m"
 * @example formatLog("Hello, {red:name}", {name: "xld"}) // "Hello, \x1b[31mxld\x1b[39m"
 * @example formatLog("{Error}: {bright:message}", {message: "foo..."}) // "\x1b[31mError\x1b[39m: \x1b[1mfoo...\x1b[39m"
 */
export function formatLog(value: string, args?: { [key: string]: any }) {
    return value.replace(/\{(?:([a-zA-Z]+):)?([^}]+)\}/g, (all, color: string, key: string) => {
        if (args != null && key in args) {
            key = args[key];
        }
        if (color) {
            const code = exports.ConsoleColor[color];
            if (code >= 0) {
                return addLogColor(key, code);
            }
        }
        return key;
    });
}

const controlRegex = /\u001b+(?:O|N|\[|\[\[)(?:\d+(?:;\d+)?[~^$]|M[@ #!a`]..|(?:1;)?(?:\d+)?[a-zA-Z])/g;

/**
 * 如果指定的日志字符串实际显示宽度超过最大值，则将超出部分替换为 `...`。
 * @param value 要处理的字符串。
 * @param width 允许的最大宽度。如果值小于等于 0 则表示和实际控制台宽度的差。
 * @return 返回已处理的字符串。
 */
export function ellipsisLog(value: string, width = 0) {

    // width <= 0 时表示和实际控制台宽度的差。
    if (width <= 0) {
        width += (process.stdout as WriteStream).columns || 80;
    }

    // 删除省略号本身的宽度。
    const ellipsis = width > 3 ? "..." : "...".substr(0, width - 1);
    width -= ellipsis.length;

    // 统计所有控制符的位置，删除时保留所有控制符。
    const controls: number[] = []; // [开始位置1, 结束位置1, 开始位置2, ...]
    value.replace(controlRegex, (all: string, index: number) => {
        controls.push(index, index + all.length - 1);
        return "";
    });

    // 左右逐字排版，超出宽度限制后停止。
    let left = 0;
    let right = value.length - 1;
    let controlLeft = 0;
    let controlRight = controls.length - 1;
    while (left < right) {

        // 排版左边一个字符。
        while (controlLeft < controls.length && controls[controlLeft] === left) {
            left = controls[controlLeft + 1] + 1;
            controlLeft += 2;
        }
        width -= getCharWidth(value.charCodeAt(left));
        if (width <= 0) {
            break;
        }
        left++;

        // 排版右边一个字符。
        while (controlRight >= 0 && controls[controlRight] === right) {
            right = controls[controlRight - 1] - 1;
            controlRight -= 2;
        }
        width -= getCharWidth(value.charCodeAt(right));
        if (width <= 0) {
            break;
        }
        right--;

    }

    // 如果已排版所有字符串说明不需要追加省略号。
    if (left >= right) {
        return value;
    }

    // 保留被截断的控制符。
    let controlStrings = "";
    for (; controlLeft < controlRight; controlLeft += 2) {
        controlStrings += value.substring(controls[controlLeft], controls[controlLeft + 1] + 1);
    }

    // 截断并排版。
    return `${value.substr(0, left)}${controlStrings}${ellipsis}${value.substr(right + 1)}`;
}

/**
 * 将指定的日志字符串按最大宽度拆成多行。
 * @param value 要处理的字符串。
 * @param width 允许的最大宽度。如果值小于等于 0 则表示和实际控制台宽度的差。
 * @return 返回包含每行内容的数组。
 */
export function splitLog(value: string, width = 0) {

    // width <= 0 时表示和实际控制台宽度的差。
    if (width <= 0) {
        width += (process.stdout as WriteStream).columns || 80;
    }

    const result: string[] = [];
    let left = 0;
    let currentWidth = 0;
    let leftBound = 0;
    for (let i = 0; i < value.length;) {

        // 控制字符。
        const ch = value.charCodeAt(i);
        if (ch === 0x001b) {
            const match = /^\u001b+(?:O|N|\[|\[\[)(?:\d+(?:;\d+)?[~^$]|M[@ #!a`]..|(?:1;)?(?:\d+)?[a-zA-Z])/.exec(value.substring(i));
            if (match) {
                leftBound = i += match[0].length;
                continue;
            }
        }

        // 排版当前字符。
        if ((currentWidth += getCharWidth(ch)) < width) {
            i++;
            continue;
        }

        if (i === leftBound) {
            i++;
        } else {
            // 尽量在空格处断词，计算实际截断的位置。
            const rightBound = i;
            while (i > leftBound && value.charCodeAt(i) !== 32 /* */) {
                i--;
            }
            if (i === leftBound) {
                i = rightBound;
            }
        }
        const line = value.substring(left, i).trim();
        line && result.push(line);
        // 忽略单词后的空格。
        while (i < value.length && value.charCodeAt(i) === 32 /* */) {
            i++;
        }
        leftBound = left = i;
        currentWidth = 0;
    }
    const line = value.substring(left, value.length).trim();
    line && result.push(line);
    return result;
}

/**
 * 格式化指定的源码内容。
 * @param source 要处理的源码内容。
 * @param width 允许的最大宽度。如果值小于等于 0 则表示和实际控制台宽度的差。
 * @param height 允许的最大行数。如果值等于 0 则显示所有行。
 * @param showLine 是否显示行号。
 * @param showColumn 是否显示列信息。
 * @param line 开始行号(从 0 开始)。
 * @param column 开始列号(从 0 开始)。
 * @param endLine 结束行号(从 0 开始)。
 * @param endColumn 结束列号(从 0 开始)。
 * @return 返回源码内容。
 */
export function formatSource(source: string, width = 0, height = 3, showLine = true, showColumn = true, line?: number, column?: number, endLine?: number, endColumn?: number) {

    // 计算要显示的开始行号。
    const firstLine = height > 0 ? Math.max(0, (line || 0) - Math.floor((height - 1) / 2)) : 0;

    // 存储所有行的数据。
    const lines: string[] = [];

    // 提取要显示的行的数据。
    let lineNumber = 0;
    for (let lastIndex = 0, i = 0; i <= source.length; i++) {
        const ch = source.charCodeAt(i);
        if (ch === 13 /*\r*/ || ch === 10 /*\n*/ || ch !== ch /*NaN*/) {

            // 只处理 firstLine 之后的行。
            if (lineNumber >= firstLine) {

                // 保存当前行的数据。
                lines.push(source.substring(lastIndex, i));
                if (height > 0 && lines.length >= height) {
                    break;
                }
            }

            if (ch === 13 /*\r*/ && source.charCodeAt(i + 1) === 10 /*\n*/) {
                i++;
            }
            lastIndex = i + 1;
            lineNumber++;
        }
    }

    // 用于显示行号的宽度。
    const lineNumberWidth = showLine ? (lineNumber + 1).toString().length : 0;

    // 计算实际可用宽度。
    if (width <= 0) {
        width += (process.stdout as WriteStream).columns || 80;
    }
    width -= lineNumberWidth + " >  | ".length + 1;

    // 计算要显示的开始列号。
    var firstColumn = 0;
    const selectedLine = lines[line! - firstLine];
    if (selectedLine != undefined && column != undefined) {
        // 确保 firstColumn 和 startColumn 之间的距离 < width / 2
        let leftWidth = Math.floor(width / 2);
        for (firstColumn = Math.min(column, selectedLine.length - 1); firstColumn > 0 && leftWidth > 0; firstColumn--) {
            leftWidth -= getCharWidth(selectedLine.charCodeAt(firstColumn));
        }
    }

    // 存储最终结果。
    let result = "";

    // 生成每一行的数据。
    for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];
        lineNumber = firstLine + i;

        // 插入换行。
        if (i > 0) {
            result += "\n";
        }

        // 生成行号。
        if (showLine) {
            result += `${lineNumber === line ? " > " : "   "}${" ".repeat(lineNumberWidth - (lineNumber + 1).toString().length)}${lineNumber + 1} | `;
        }

        // 生成数据。
        let columnMarkerStart: number | undefined;
        let columnMarkerEnd: number | undefined;
        let currentWidth = 0;
        for (let j = firstColumn; j <= currentLine.length; j++) {

            // 存储占位符的位置。
            if (lineNumber === line) {
                if (j === column) {
                    columnMarkerStart = currentWidth;
                }
                if (line === endLine && j >= column! && j <= endColumn!) {
                    columnMarkerEnd = currentWidth;
                }
            }

            // 超出宽度后停止。
            const ch = currentLine.charCodeAt(j);
            if (ch !== ch /*NaN*/ || (currentWidth += getCharWidth(ch)) > width) {
                break;
            }

            // 将 TAB 转为空格。
            if (ch === 9/*\t*/) {
                result += "    ";
                continue;
            }

            result += currentLine.charAt(j);
        }

        // 生成行指示器。
        if (showColumn && lineNumber === line && columnMarkerStart != undefined) {
            result += "\n";
            if (showLine) {
                result += `   ${" ".repeat(lineNumberWidth)} | `;
            }
            result += `${" ".repeat(columnMarkerStart)}${columnMarkerEnd! > columnMarkerStart ? "~".repeat(columnMarkerEnd! - columnMarkerStart) : "^"}`;
        }

    }

    return result;
}

/**
 * 获取指定字符的控制台显示宽度。
 * @param char 要处理的 Unicode 字符编码。
 * @return 返回字符宽度。一般地，西文字母返回 1，中文文字返回 2 。
 */
function getCharWidth(char: number) {
    if (char <= 0x1f || (char >= 0x7f && char <= 0x9f)) {
        if (char === 9/*\t*/) {
            return 4;
        }
        return 1;
    }

    // NOTE: 如果使用了 Unicode 代理区（Surrogate）字符。
    // 则应考虑计算实际对应字符的长度。
    // 为了简化程序，考虑此函数使用场景是控制台字符显示，因此代理区
    // 字符统一被认为是宽度 2。
    if (isFullwidthCodePoint(char)) {
        return 2;
    }

    return 1;
}

/**
 * 判断指定的字符是否是宽字符。
 * @param char 要处理的字符编码。
 * @return 如果是宽字符则返回 true，否则返回 false。
 * @see https://github.com/nodejs/io.js/blob/cff7300a578be1b10001f2d967aaedc88aee6402/lib/readline.js#L1369
 */
function isFullwidthCodePoint(char: number) {
    return char >= 0x1100 && (
        // CJK Unified Ideographs .. Yi Radicals
        0x4e00 <= char && char <= 0xa4c6 ||
        // Hangul Jamo
        char <= 0x115f ||
        // LEFT-POINTING ANGLE BRACKET
        0x2329 === char ||
        // RIGHT-POINTING ANGLE BRACKET
        0x232a === char ||
        // CJK Radicals Supplement .. Enclosed CJK Letters and Months
        (0x2e80 <= char && char <= 0x3247 && char !== 0x303f) ||
        // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
        0x3250 <= char && char <= 0x4dbf ||
        // Hangul Jamo Extended-A
        0xa960 <= char && char <= 0xa97c ||
        // Hangul Syllables
        0xac00 <= char && char <= 0xd7a3 ||
        // CJK Compatibility Ideographs
        0xf900 <= char && char <= 0xfaff ||
        // Vertical Forms
        0xfe10 <= char && char <= 0xfe19 ||
        // CJK Compatibility Forms .. Small Form Variants
        0xfe30 <= char && char <= 0xfe6b ||
        // Halfwidth and Fullwidth Forms
        0xff01 <= char && char <= 0xff60 ||
        0xffe0 <= char && char <= 0xffe6 ||
        // Kana Supplement
        0x1b000 <= char && char <= 0x1b001 ||
        // Enclosed Ideographic Supplement
        0x1f200 <= char && char <= 0x1f251 ||
        // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
        0x20000 <= char && char <= 0x3fffd);
}
