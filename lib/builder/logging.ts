/**
 * @fileOverview 日志
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { resolvePath, relativePath, pathEquals } from "../utility/path";
import { formatLog, addLogColor, removeLogColor, ConsoleColor, formatSource } from "../utility/log";

/**
 * 表示日志等级。
 */
export const enum LogLevel {

    /**
     * 详细信息。
     */
    verbose,

    /**
     * 普通日志。
     */
    log,

    /**
     * 信息日志。
     */
    info,

    /**
     * 成功日志。
     */
    success,

    /**
     * 失败日志。
     */
    failure,

    /**
     * 警告日志。
     */
    warning,

    /**
     * 错误日志。
     */
    error,

    /**
     * 致命错误日志。
     */
    fatal,

    /**
     * 无日志。
     */
    slient,

}

/**
 * 获取或设置允许输出的日志等级。
 */
export var logLevel = LogLevel.log;

/**
 * 表示一条日志项。
 */
export class LogEntry {

    /**
     * 所属插件名。
     */
    plugin?: string;

    /**
     * 信息。
     */
    message?: string;

    /**
     * 详情。
     */
    detail?: string;

    /**
     * 源路径。
     */
    path?: string;

    /**
     * 源内容。
     */
    content?: string;

    /**
     * 开始行号(从 0 开始)。
     */
    startLine?: number;

    /**
     * 开始列号(从 0 开始)。
     */
    startColumn?: number;

    /**
     * 结束行号(从 0 开始)。
     */
    endLine?: number;

    /**
     * 结束列号(从 0 开始)。
     */
    endColumn?: number;

    /**
     * 原始错误对象。
     */
    error?: Error;

    /**
     * 已格式化的源内容。
     */
    sourceContent?: string;

    /**
     * 初始化新的日志项。
     * @param data 要处理的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    constructor(data: string | Error | LogEntry, args?: Object) {

        // 处理原始日志数据。
        if (data instanceof Error) {
            this.error = data;
        } else if (typeof data === "string") {
            this.message = data;
        } else if (data instanceof String) {
            this.message = data.toString();
        } else {
            Object.assign(this, data);
        }

        // 从错误对象提取信息。
        const error: any = this.error;
        if (error) {
            if (this.message == undefined) this.message = error.message || error.msg || error.description || error.toString();
            if (this.path == undefined) this.path = error.path || error.fileName || error.filename || error.filepath || error.file || error.source;
            if (this.startLine == undefined) {
                const line = +(error.startLine || error.line || error.linenumber || error.lineno || error.row);
                if (line > 0) {
                    this.startLine = line - 1;
                }
            }
            if (this.startLine != undefined && this.startColumn == undefined) {
                const column = +(error.startColumn + 1 || error.column + 1 || error.col + 1 || error.colno + 1);
                if (column > 0) {
                    this.startColumn = column - 1;
                }
            }
        }

        // 格式化信息。
        this.message = format(this.message, args);
        this.path = this.path ? resolvePath(this.path) : undefined;

    }

    /**
     * 获取当前日志数据的字符串形式。
     */
    toString?() {

        let result = "";

        // 添加名字。
        if (this.plugin != undefined) {
            result += `[${addLogColor(this.plugin, ConsoleColor.cyan)}]`;
        }

        // 添加路径信息。
        if (this.path != undefined) {
            result += getDisplayName(this.path);
            if (this.startLine != undefined) {
                result += "(" + (this.startLine + 1);
                if (this.startColumn != undefined) {
                    result += "," + this.startColumn;
                }
                result += ")";
            }
            result += ": ";
        }

        // 添加信息。
        if (this.message != undefined) {
            result += this.message;
        }

        // 添加源码信息。
        if (source && this.content != undefined && this.startLine != undefined) {
            result += `\n\n${addLogColor(this.sourceContent != undefined ? this.sourceContent : formatSource(this.content, source.width, source.height, source.lineNumbers, source.columnNumbers, this.startLine, this.startColumn, this.endLine, this.endColumn), ConsoleColor.gray)}\n`;
        }

        // 添加详细信息。
        if (logLevel === LogLevel.verbose) {
            if (this.detail) {
                result += `\n${addLogColor(this.detail, ConsoleColor.gray)}`;
            }
            if (this.error && this.error.stack) {
                result += `\n${addLogColor(this.error.stack, ConsoleColor.gray)}`;
            }
        }

        return result;
    }

}

/**
 * 设置在控制台显示源的方式。如果设为 null 则不显示源码。
 */
export var source = {

    /**
     * 最大显示的宽度。如果为 0 则和控制台宽度相同。
     */
    width: 0,

    /**
     * 最大显示的高度。
     */
    height: 3,

    /**
     * 是否显示行号。
     */
    lineNumbers: true,

    /**
     * 是否显示列号。
     */
    columnNumbers: true,

};

/**
 * 获取或设置记录日志时的回调函数。
 * @param data 要记录的日志项。
 * @param level 要记录的日志等级。
 * @returns 如果函数返回 false，则表示忽略此日志。
 */
export var onLog: (data: LogEntry, level: LogLevel) => (boolean | void) = null;

/**
 * 获取或设置是否在控制台显示带颜色的文本。
 */
export var colors = !!(<boolean | void>(<WriteStream>process.stdout).isTTY) && !process.env["NODE_DISABLE_COLORS"];

/**
 * 获取累积的警告数。
 */
export var warningCount = 0;

/**
 * 获取累积的错误数。
 */
export var errorCount = 0;

/**
 * 记录一条日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @param level 要记录的日志等级。
 */
export function log(data: string | Error | LogEntry, args?: Object, level?: LogLevel) {

    // 处理等级。
    switch (level) {
        case undefined:
            level = LogLevel.log;
            break;
        case LogLevel.error:
        case LogLevel.fatal:
            errorCount++;
            break;
        case LogLevel.warning:
            warningCount++;
            break;
    }

    // 验证等级。
    if (level < logLevel) {
        return;
    }

    // 创建日志数据。
    if (!(data instanceof LogEntry)) {
        data = new LogEntry(data, args);
    }

    // 自定义打印日志。
    if (onLog && onLog(data, level) === false) return;

    // 格式化日志。
    let message = data.toString();

    // 删除颜色。
    if (!colors) message = removeLogColor(message);

    // 打印日志。
    switch (level) {
        case LogLevel.error:
        case LogLevel.fatal:
            var prefix = level === LogLevel.fatal ? "fatal error: " : `error ${errorCount}: `;
            if (colors) prefix = addLogColor(prefix, ConsoleColor.red);
            return console.error(prefix + message);
        case LogLevel.warning:
            var prefix = `warning ${warningCount}: `;
            if (colors) prefix = addLogColor(prefix, ConsoleColor.yellow);
            return console.warn(prefix + message);
        case LogLevel.info:
        case LogLevel.success:
        case LogLevel.failure:
            return console.info(message);
        default:
            return console.log(message);
    }

}

/**
 * 记录一条信息日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function info(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.info);
}

/**
 * 记录一条警告日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function warning(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.warning);
}

/**
 * 记录一条错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function error(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.error);
}

/**
 * 记录一条致命错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function fatal(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.fatal);
}

/**
 * 记录一条详细日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function verbose(data: string | Error | LogEntry, args?: Object) {
    return log(data, args, LogLevel.verbose);
}

/**
 * 获取或设置所有消息的本地化版本。
 */
export var dict: { [message: string]: string } = { __proto__: null };

/**
 * 格式化指定的日志信息。
 * @param message 要处理的日志信息。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回已格式化的消息。
 * @example format("abc{a}{b}", { a: 1, b: 2 }) // "abc1"
 * @example format("abc{0}{1}", [1, 2]) // "abc12"
 */
export function format(message: string, args?: Object) {
    message = dict[message] || message;
    if (args != undefined) message = formatLog(message, args);
    return message;
}

/**
 * 获取或设置是否显示完整路径。
 */
export var fullPath = false;

/**
 * 获取或设置在未显示完整路径时使用的基路径。
 */
export var currentDir = process.cwd();

/**
 * 获取指定路径的友好显示名称。
 * @param path 要处理的路径。
 * @returns 如果 *fullPath* 为 false 则返回基于 *currentDir* 的相对路径，否则返回绝对路径。
 */
export function getDisplayName(path: string) {
    if (!path) {
        return "";
    }
    if (fullPath) {
        return resolvePath(path);
    }
    return relativePath(currentDir, path);
}
