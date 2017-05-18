import { readFile } from "../utility/fs";
import { Matcher, Pattern } from "../utility/matcher";
import { globalMatcher } from "./src";
import logging = require("./logging");
import progress = require("./progress");
import file = require("./file");
import run = require("./run");
import watch = require("./watch");

/**
 * 表示全局选项。
 */
export interface Config {

    /**
     * 是否显示详细信息。
     */
    verbose?: boolean;

    /**
     * 是否禁用所有日志。
     */
    silent?: boolean;

    /**
     * 允许输出的最低日志等级。
     */
    logLevel?: typeof logging.logLevel | "verbose" | "log" | "info" | "warning" | "error" | "fatal" | "slient";

    /**
     * 是否显示完整路径。
     */
    fullPath?: typeof logging.fullPath;

    /**
     * 允许输出的最大日志长度。0 表示不限制。
     */
    logMaxLength?: typeof logging.logMaxLength;

    /**
     * 在控制台显示源内容的格式。如果设为 false 则不显示源内容。
     */
    logSource?: boolean | typeof logging.logSource;

    /**
     * 是否在控制台显示带颜色的文本。
     */
    colors?: typeof logging.colors;

    /**
     * 在未显示完整路径时使用的基路径。
     */
    displayRoot?: typeof logging.displayRoot;

    /**
     * 所有消息的本地化版本。
     */
    dict?: typeof logging.dict;

    /**
     * 是否在控制台显示进度条。
     */
    progress?: typeof progress.progress;

    /**
     * 是否允许覆盖源文件。
     */
    overwrite?: typeof file.overwrite;

    /**
     * 文件的生成模式。
     */
    buildMode?: typeof file.buildMode | "build" | "clean" | "preview";

    /**
     * 读写文件使用的默认编码。
     */
    encoding?: typeof file.encoding;

    /**
     * 是否启用源映射。
     */
    sourceMap?: typeof file.sourceMap;

    /**
     * 是否允许生成器使用源映射进行定位。
     */
    evalSourceMap?: typeof file.evalSourceMap;

    /**
     * 用于获取每个文件的源映射路径的回调函数。
     * 字符串中 `{name}` 代表源文件名。
     * @param file 源文件。
     */
    sourceMapPath?: string | typeof file.sourceMapPath;

    /**
     * 用于获取每个文件的源映射地址的回调函数。
     * 字符串中 `{name}` 代表源文件名。
     * @param file 源文件。
     */
    sourceMapUrl?: string | typeof file.sourceMapUrl;

    /**
     * 用于获取每个源映射中指定源文件地址的回调函数。
     * @param source 指向的源文件。
     * @param file 当前文件。
     */
    sourceMapSource?: typeof file.sourceMapSource;

    /**
     * 是否在源文件中内联源映射。
     */
    sourceMapInline?: typeof file.sourceMapInline;

    /**
     * 是否在源文件追加对源映射的引用地址。
     */
    sourceMapEmit?: typeof file.sourceMapEmit;

    /**
     * 源映射中引用源的跟地址。
     */
    sourceMapRoot?: typeof file.sourceMapRoot;

    /**
     * 是否在源映射插入 sourcesContent 段。
     */
    sourceMapIncludeSourcesContent?: typeof file.sourceMapIncludeSourcesContent;

    /**
     * 是否在源映射插入 file 段。
     */
    sourceMapIncludeFile?: typeof file.sourceMapIncludeFile;

    /**
     * 是否在源映射插入 names 段。
     */
    sourceMapIncludeNames?: typeof file.sourceMapIncludeNames;

    /**
     * 全局筛选的文件或文件夹地址。
     */
    filter?: Pattern;

    /**
     * 全局忽略的文件或文件夹地址。
     */
    ignore?: Pattern;

    /**
     * 全局载入的忽略文件地址(如 .gitignore)。
     */
    ignoreFile?: string;

    /**
     * 是否在生成完成后报告结果。
     */
    report?: typeof run.report;

    /**
     * 是否采用轮询监听的方式。
     */
    polling?: typeof watch.polling;

}

/**
 * 设置全局选项。
 * @param configs 要设置的选项。
 */
export function config(configs: Config) {
    for (const key in configs) {
        const value = (configs as any)[key];
        switch (key) {
            case "verbose":
                if (value) {
                    logging.logLevel = logging.LogLevel.verbose;
                }
                break;
            case "slient":
                if (value) {
                    progress.progress = false;
                    logging.logLevel = logging.LogLevel.slient;
                }
                break;
            case "logLevel":
                logging.logLevel = typeof value === "string" ? (logging as any).LogLevel[value] : value;
                break;
            case "fullPath":
                logging.fullPath = value;
                break;
            case "logMaxLength":
                logging.logMaxLength = value;
                break;
            case "logSource":
                logging.logSource = typeof value === "boolean" ? (value ? logging.logSource : null) : value;
                break;
            case "colors":
                logging.colors = value;
                break;
            case "displayRoot":
                logging.displayRoot = value;
                break;
            case "dict":
                logging.dict = value || {};
                break;
            case "progress":
                progress.progress = value;
                break;
            case "overwrite":
                file.overwrite = value;
                break;
            case "buildMode":
                file.buildMode = typeof value === "string" ? (file as any).BuildMode[value] : value;
                break;
            case "encoding":
                file.encoding = value;
                break;
            case "sourceMap":
                file.sourceMap = value;
                break;
            case "evalSourceMap":
                file.evalSourceMap = value;
                break;
            case "sourceMapPath":
                file.sourceMapPath = typeof value === "string" ? file => file.name == undefined ? undefined : value.replace("{name}", file.name) : value;
                break;
            case "sourceMapUrl":
                file.sourceMapUrl = typeof value === "string" ? file => file.name == undefined ? undefined : value.replace("{name}", file.name) : value;
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
            case "filter":
                globalMatcher.add(value);
                break;
            case "ignore":
                globalMatcher.addIgnore(value);
                break;
            case "ignoreFile":
                loadIgnore(value);
                break;
            case "report":
                run.report = value;
                break;
            case "polling":
                watch.polling = value;
                break;
        }
    }
}

/**
 * 载入忽略文件（如 .gitignore）。
 * @param path 要载入的文件路径。
 */
function loadIgnore(path: string) {
    readFile(path).toString().replace(/^\s*([^#\s](?:\\\s|\s\S|\S)*)\s*$/gm, (_, pattern: string) => {
        globalMatcher.addIgnore(pattern);
        return "";
    });
}
