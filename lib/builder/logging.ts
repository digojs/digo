/**
 * @fileOverview 日志
 * @author xuld <xuld@vip.qq.com>
 */
import { WriteStream } from "tty";
import { resolvePath, relativePath } from "../utility/path";
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
 * 表示一条日志数据。
 */
export interface LogData {

    /**
     * 日志来源。
     */
    sender?: string;

    /**
     * 日志信息。
     */
    message?: string;

    /**
     * 错误和警告详情。
     */
    detail?: string;

    /**
     * 原始错误对象。
     */
    error?: Error;

    /**
     * 源文件名。
     */
    fileName?: string;

    /**
     * 源内容。
     */
    sourceContent?: string;

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

}

/**
 * 获取或设置记录日志时的回调函数。
 * @param message 要记录的日志信息。
 * @param level 要记录的日志等级。
 * @param data 要记录的日志数据。
 * @returns 如果函数返回 false，则表示忽略此日志。
 */
export var onLog: (message: string, level: LogLevel, data: string | Error | LogData) => (boolean | void);

/**
 * 获取或设置是否在控制台显示带颜色的文本。
 */
export var colors = !!(<boolean | void>(<WriteStream>process.stdout).isTTY);

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
export function log(data: string | Error | LogData, args?: Object, level?: LogLevel) {

    // 验证等级。
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
    if (level < logLevel) return;

    // 格式化日志。
    const message = format(data, args);

    // 筛选日志。
    if (onLog && onLog(message, level, data) === false) return;

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
export function info(data: string | Error | LogData, args?: Object) {
    return log(data, args, LogLevel.info);
}

/**
 * 记录一条警告日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function warning(data: string | Error | LogData, args?: Object) {
    return log(data, args, LogLevel.warning);
}

/**
 * 记录一条错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function error(data: string | Error | LogData, args?: Object) {
    return log(data, args, LogLevel.error);
}

/**
 * 记录一条致命错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function fatal(data: string | Error | LogData, args?: Object) {
    return log(data, args, LogLevel.fatal);
}

/**
 * 记录一条详细日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function verbose(data: string | Error | LogData, args?: Object) {
    return log(data, args, LogLevel.verbose);
}

/**
 * 获取或设置所有消息的本地化版本。
 */
export var dict: { [message: string]: string } = { __proto__: null };

/**
 * 格式化指定的日志信息。
 * @param data 要处理的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回已格式化的消息。
 * @example format("abc{a}{b}", { a: 1, b: 2 }) // "abc1"
 * @example format("abc{0}{1}", [1, 2]) // "abc12"
 */
export function format(data: string | Error | LogData, args?: Object) {
    let message = typeof data === "string" ? data : data.message;
    message = dict[message] || message;
    if (args != undefined) message = formatLog(message, args);

    if (typeof data !== "string") {
        if (data instanceof Error) {
            // 追加错误堆栈信息。
            if (logLevel === LogLevel.verbose && data.stack) {
                message += `\n${addLogColor(data.stack, ConsoleColor.gray)}`;
            }
        } else {

            // 处理文件名。
            let prefix = "";
            if (data.sender != undefined) {
                prefix += `[${addLogColor(data.sender, ConsoleColor.cyan)}]`;
            }
            if (data.fileName != undefined) {
                prefix += getDisplayName(data.fileName);
                if (data.startLine != undefined) {
                    prefix += "(" + (data.startLine + 1);
                    if (data.startColumn != undefined) {
                        prefix += "," + data.startColumn;
                    }
                    prefix += ")";
                }
                prefix += ": ";
            }
            message = prefix + message;

            // 处理源码。
            if (source && data.sourceContent != undefined) {
                message += `\n\n${addLogColor(formatSource(data.sourceContent, source.width, source.height, source.lineNumbers, source.columnNumbers, data.startLine, data.startColumn, data.endLine, data.endColumn), ConsoleColor.gray)}\n`;
            }

            // 添加详细信息。
            if (logLevel === LogLevel.verbose) {
                if (data.detail) {
                    message += `\n${addLogColor(data.detail, ConsoleColor.gray)}`;
                }
                if (data.error && data.error.stack) {
                    message += `\n${addLogColor(data.error.stack, ConsoleColor.gray)}`;
                }
            }

        }

    }

    if (!colors) message = removeLogColor(message);

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
