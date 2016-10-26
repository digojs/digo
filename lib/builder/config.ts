/**
 * @fileOverview 配置
 * @author xuld <xuld@vip.qq.com>
 */
import { addCallback } from "../utility/object";
import { Matcher, Pattern } from "../utility/matcher";
import { SourceMapObject } from "../utility/sourceMap";
import { readFileSync } from "../utility/fsSync";
import { matcher } from "./src";
import logging = require("./logging");
import progress = require("./progress");
import file = require("./file");

/**
 * 表示全局选项。
 */
export interface Config {

    /**
     * 设置筛选的文件或文件夹地址。
     */
    filter?: Pattern;

    /**
     * 设置忽略的文件或文件夹地址。
     */
    ignore?: Pattern;

    /**
     * 设置载入的忽略文件地址(如 .gitignore)。
     */
    ignoreFile?: string;

    /**
     * 设置是否在控制台显示完整路径。如果为 false 则显示相当于当前目录的路径。
     */
    fullPath?: boolean;

    /**
     * 设置允许输出的最低日志等级。
     */
    logLevel?: logging.LogLevel | "verbose" | "log" | "info" | "success" | "failure" | "warning" | "error" | "fatal" | "slient";

    /**
     * 设置是否显示详细信息。
     */
    verbose?: boolean;

    /**
     * 设置是否禁用所有日志。
     */
    slient?: boolean;

    /**
     * 设置是否启用带颜色的控制台输出。
     */
    colors?: boolean;

    /**
     * 设置记录日志的回调函数。
     * @param message 要记录的日志内容。
     * @param level 要记录的日志等级。
     * @returns 如果函数返回 false，则忽略此日志。
     */
    onLog?: (message: string, level: logging.LogLevel) => (boolean | void);

    /**
     * 设置所有消息的本地翻译版本。
     */
    dict?: { [message: string]: string };

    /**
     * 设置日志的保存地址。如果地址为空则不保存日志文件。
     */
    logFile?: boolean | string;

    /**
     * 设置是否显示进度条。
     */
    progress?: boolean;

    /**
     * 设置读写文件使用的默认编码。
     */
    encoding?: string;

    /**
     * 设置是否启用源映射。
     */
    sourceMap?: boolean;

    /**
     * 设置是否允许生成器使用源映射进行定位。
     */
    evalSourceMap?: boolean;

    /**
     * 设置用于获取每个文件的源映射路径的回调函数。
     * 字符串中 {name} 代表源文件名。
     * @param file 源文件。
     */
    sourceMapPath?: string | ((file: file.File) => string);

    /**
     * 设置用于获取每个文件的源映射地址的回调函数。
     * 字符串中 {name} 代表源文件名。
     * @param file 源文件。
     */
    sourceMapUrl?: string | ((file: file.File) => string);

    /**
     * 设置用于获取每个源映射中指定源文件地址的回调函数。
     * @param source 指向的源文件。
     * @param file 当前文件。
     */
    sourceMapSource?: (source: file.File, file: file.File) => string;

    /**
     * 设置是否在源文件中内联源映射。
     */
    sourceMapInline?: boolean;

    /**
     * 设置是否在源文件追加对源映射的引用地址。
     */
    sourceMapEmit?: boolean;

    /**
     * 设置源映射中引用源的跟地址。
     */
    sourceMapRoot?: string;

    /**
     * 设置是否在源映射插入 sourcesContent 段。
     */
    sourceMapIncludeSourcesContent?: boolean;

    /**
     * 设置是否在源映射插入 file 段。
     */
    sourceMapIncludeFile?: boolean;

    /**
     * 设置是否在源映射插入 names 段。
     */
    sourceMapIncludeNames?: boolean;

}

/**
 * 设置全局选项。
 * @param configs 要设置的选项。
 */
export function config(configs: Config) {
    for (const key in configs) {
        const value = configs[key];
        switch (key) {
            case "filter":
                matcher.add(value);
                break;
            case "ignore":
                matcher.addIgnore(value);
                break;
            case "ignoreFile":
                loadIgnore(value);
                break;
            case "fullPath":
                logging.fullPath = value;
                break;
            case "logLevel":
                logging.logLevel = typeof value === "string" ? (<any>logging).LogLevel[value] : value;
                break;
            case "slient":
                if (value) {
                    progress.progress = false;
                    logging.logLevel = logging.LogLevel.slient;
                }
                break;
            case "verbose":
                if (value) {
                    logging.logLevel = logging.LogLevel.verbose;
                }
                break;
            case "colors":
                logging.colors = value;
                break;
            case "log":
                addCallback(logging, "onLog", value);
                break;
            case "dict":
                logging.dict = value || {};
                break;
            case "progress":
                progress.progress = value;
                break;
            case "encoding":
                file.encoding = value || "utf-8";
                break;
            case "sourceMap":
                if (typeof value === "string") {
                    const matcher = new Matcher(value);
                    file.sourceMap = file => { return matcher.test(file.srcPath); };
                    break;
                }
                file.sourceMap = value;
                break;
            case "sourceMapPath":
                file.sourceMapPath = typeof value === "string" ? file => value.replace("{name}", file.name) : value;
                break;
            case "sourceMapUrl":
                file.sourceMapUrl = typeof value === "string" ? file => value.replace("{name}", file.name) : value;
                break;
            case "sourceMapSource":
                file.sourceMapSource = value;
                break;
            case "sourceMapInline":
                file.sourceMapInline = value;
                break;
            case "emitSourceMap":
                file.sourceMapEmit = value;
                break;
            case "sourceMapRoot":
                file.sourceMapRoot = value;
                break;
            case "sourceMapIncludeSourcesContent":
                file.sourceMapIncludeSourcesContent = value;
                break;
            case "sourceMapIncludeFile":
                file.sourceMapIncludeFile = value;
                break;
            case "sourceMapIncludeNames":
                file.sourceMapIncludeNames = value;
                break;
        }
    }
}

/**
 * 载入忽略文件（如 .gitignore）。
 * @param path 要载入的文件路径。
 */
export function loadIgnore(path: string) {
    readFileSync(path).toString("utf-8").replace(/^\s*([^#\s](?:\\\s|\s\S|\S)*)\s*$/gm, (_, pattern: string) => {
        matcher.addIgnore(pattern);
        return "";
    });
}
