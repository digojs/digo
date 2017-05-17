/**
 * @file digo: 一个描述式的轻量自动化构建工具
 * @see https://github.com/digojs/digo
 */
import * as _digo from "./digo";
declare global {
    export var digo: typeof _digo;
}

export * from "./utility/lang";
export * from "./utility/encode";
export * from "./utility/crypto";
export * from "./utility/path";
export * from "./utility/url";
export * from "./utility/fs";
export * from "./utility/matcher";
export * from "./utility/glob";
export * from "./utility/sourceMap";
export * from "./utility/location";
export * from "./utility/commandLine";

export * from "./builder/events";
export * from "./builder/logging";
export * from "./builder/progress";
export * from "./builder/async";
export * from "./builder/plugin";
export * from "./builder/exec";
export * from "./builder/file";
export * from "./builder/writer";
export * from "./builder/fileList";
export * from "./builder/src";
export * from "./builder/watch";
export * from "./builder/server";
export * from "./builder/init";
export * from "./builder/run";
export * from "./builder/config";
