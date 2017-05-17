import { WriteStream } from "tty";
import { addLogColor, ConsoleColor, formatLog, formatSource, removeLogColor } from "../utility/log";
import { relativePath, resolvePath } from "../utility/path";
import { emit } from "./events";

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
     * 信息。
     */
    info,

    /**
     * 警告。
     */
    warning,

    /**
     * 错误。
     */
    error,

    /**
     * 致命错误。
     */
    fatal,

    /**
     * 无日志。
     */
    slient

}

/**
 * 允许输出的最低日志等级。
 */
export var logLevel = LogLevel.log;

/**
 * 允许输出的最大日志长度。0 表示不限制。
 */
export var logMaxLength = ((process.stdout as WriteStream).columns || 80) * 5;

/**
 * 在控制台显示源内容的格式。如果设为 null 则不显示源内容。
 */
export var logSource = {

    /**
     * 最大显示的宽度。如果小于等于 0 则表示和控制台实际宽度的差。
     */
    width: 0,

    /**
     * 最大显示的高度。
     */
    height: 3,

    /**
     * 是否高亮行。
     */
    showLine: true,

    /**
     * 是否高亮列。
     */
    showColumn: true

};

/**
 * 是否在控制台显示带颜色的文本。
 */
export var colors = (process.stdout as WriteStream).isTTY === true && !process.env["NODE_DISABLE_COLORS"];

/**
 * 记录日志时的回调函数。
 * @param log 要记录的日志项。
 * @param level 要记录的日志等级。
 * @return 如果函数返回 false，则不在控制台输出当前日志。
 */
export var onLog = (log: LogEntry, level: LogLevel) => !emit("log", log, level);

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
 * @param data 要记录的日志。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @param level 要记录的日志等级。
 */
export function log(data: string | Error | LogEntry, args?: { [key: string]: any }, level = LogLevel.log) {

    // 验证等级。
    switch (level) {
        case LogLevel.error:
        case LogLevel.fatal:
            errorCount++;
            break;
        case LogLevel.warning:
            warningCount++;
            break;
    }
    if (level < logLevel) {
        return;
    }

    // 统一日志数据格式。
    if (!(data instanceof LogEntry)) {
        data = new LogEntry(data, args);
    }

    // 自定义打印日志。
    if (onLog && onLog(data, level) === false) {
        return;
    }

    // 打印日志。
    const message = data.toString(colors);
    switch (level) {
        case LogLevel.error:
            var prefix = `error ${errorCount}: `;
            if (colors) {
                prefix = addLogColor(prefix, ConsoleColor.brightRed);
            }
            return console.error(prefix + message);
        case LogLevel.fatal:
            var prefix = `fatal error: `;
            if (colors) {
                prefix = addLogColor(prefix, ConsoleColor.brightRed);
            }
            return console.error(prefix + message);
        case LogLevel.warning:
            var prefix = `warning ${warningCount}: `;
            if (colors) {
                prefix = addLogColor(prefix, ConsoleColor.brightYellow);
            }
            return console.warn(prefix + message);
        case LogLevel.info:
            return console.info(message);
        default:
            // tslint:disable-next-line:no-console
            return console.log(message);
    }

}

/**
 * 记录一条信息日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function info(data: string | Error | LogEntry, args?: { [key: string]: any }) {
    log(data, args, LogLevel.info);
}

/**
 * 记录一条警告日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function warning(data: string | Error | LogEntry, args?: { [key: string]: any }) {
    log(data, args, LogLevel.warning);
}

/**
 * 记录一条错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function error(data: string | Error | LogEntry, args?: { [key: string]: any }) {
    log(data, args, LogLevel.error);
}

/**
 * 记录一条致命错误日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function fatal(data: string | Error | LogEntry, args?: { [key: string]: any }) {
    log(data, args, LogLevel.fatal);
    process.exit(-1);
}

/**
 * 记录一条详细日志。
 * @param data 要记录的日志数据。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 */
export function verbose(data: string | Error | LogEntry, args?: { [key: string]: any }) {
    return log(data, args, LogLevel.verbose);
}

/**
 * 所有消息的本地化版本。
 */
export var dict: { [message: string]: string } = { __proto__: null! };

/**
 * 格式化指定的日志信息。
 * @param message 要处理的日志信息。
 * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
 * @return 返回已格式化的消息。
 * @example format("abc{a}{b}", { a: 1, b: 2 }) // "abc1"
 * @example format("abc{0}{1}", [1, 2]) // "abc12"
 */
export function format(message: string, args?: { [key: string]: any }) {
    message = dict[message] || message;
    if (args != undefined) {
        message = formatLog(message, args);
    }
    return message;
}

/**
 * 是否显示完整路径。
 */
export var fullPath = false;

/**
 * 在未显示完整路径时使用的基路径。
 */
export var displayRoot = process.env["INIT_CWD"] || process.cwd();

/**
 * 获取指定路径的友好显示名称。
 * @param path 要处理的路径。
 * @return 如果 *fullPath* 为 false 则返回基于 *cwd* 的相对路径，否则返回绝对路径。
 */
export function getDisplayName(path: string) {
    if (fullPath) {
        return resolvePath(path);
    }
    return relativePath(displayRoot, path) || ".";
}

/**
 * 表示一条日志项。
 */
export class LogEntry {

    /**
     * 所属的插件名。
     */
    readonly plugin?: string;

    /**
     * 日志信息。
     */
    readonly message?: string;

    /**
     * 源文件名。
     */
    readonly fileName?: string;

    /**
     * 行号(从 0 开始)。
     */
    readonly line?: number;

    /**
     * 列号(从 0 开始)。
     */
    readonly column?: number;

    /**
     * 结束行号(从 0 开始)。
     */
    readonly endLine?: number;

    /**
     * 结束列号(从 0 开始)。
     */
    readonly endColumn?: number;

    /**
     * 原始错误对象。
     */
    readonly error?: Error;

    /**
     * 是否打印错误堆栈信息。
     */
    readonly showStack?: boolean;

    /**
     * 源内容。
     */
    readonly content?: string;

    /**
     * 发生错误的源。
     */
    readonly source?: string;

    /**
     * 初始化新的日志项。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    constructor(data: string | Error | LogEntry, args?: { [key: string]: any }) {
        if (typeof data === "string") {
            this.message = data;
        } else if (data instanceof Error) {
            this.message = data.message;
            this.error = data;
        } else {
            data = Object.assign(this, data);
            if (!this.message) {
                this.message = this.error ? this.error.message : "";
            }
            if (this.fileName) {
                this.fileName = resolvePath(this.fileName);
            }
        }
        this.message = format(this.message, args);
    }

    /**
     * 获取当前日志数据的字符串形式。
     * @param colors 是否包含颜色信息。
     * @return 返回格式化后的日志。
     */
    toString(colors?: boolean) {

        let result = "";

        // 添加插件。
        if (this.plugin) {
            result += addLogColor(`[${this.plugin}]`, ConsoleColor.brightCyan);
        }

        // 添加路径。
        if (this.fileName) {
            let path = getDisplayName(this.fileName);
            if (this.line != undefined) {
                path += "(" + (this.line + 1);
                if (this.column != undefined) {
                    path += "," + (this.column + 1);
                }
                path += ")";
            }
            result += addLogColor(path, ConsoleColor.bright) + ": ";
        }

        // 添加信息。
        if (logLevel === LogLevel.verbose || this.plugin == undefined || logMaxLength <= 0 || this.message!.length < logMaxLength) {
            result += this.message;
        } else {
            result += this.message!.substring(0, logMaxLength - 3) + addLogColor("...", ConsoleColor.brightBlack);
        }

        // 添加源信息。
        const source = logSource && (this.source != undefined ? this.source : this.content != undefined && this.line != undefined ? formatSource(this.content, logSource.width, logSource.height, logSource.showLine, logSource.showColumn, this.line, this.column, this.endLine, this.endColumn) : undefined);
        if (source) {
            result += `\n\n${addLogColor(source, ConsoleColor.brightBlack)}\n`;
        }

        // 添加堆栈信息。
        const stack = (logLevel === LogLevel.verbose || (this.showStack != undefined ? this.showStack : this.fileName == undefined && this.source == undefined)) && this.error && this.error.stack;
        if (stack) {
            result += `\n\n${addLogColor(stack, ConsoleColor.brightBlack)}\n`;
        }

        // 去除颜色信息。
        if (!colors) {
            result = removeLogColor(result);
        }

        return result;
    }

}
