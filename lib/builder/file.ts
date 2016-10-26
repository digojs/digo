/**
 * @fileOverview 文件
 * @author xuld <xuld@vip.qq.com>
 */
import { Stats } from "fs";
import { setProperty } from "../utility/object";
import { resolvePath, relativePath, getDir, setDir, getExt, setExt, inDir, pathEquals } from "../utility/path";
import { resolveUrl, relativeUrl } from "../utility/url";
import { stringToBuffer, bufferToString, base64Uri } from "../utility/encode";
import { readFileSync, existsFileSync, getStatSync } from "../utility/fsSync";
import { readFile, writeFile, copyFile, deleteFile, deleteParentDirIfEmpty } from "../utility/fs";
import { Pattern, Matcher } from "../utility/matcher";
import { SourceMapData, SourceMapObject, SourceMapBuilder, toSourceMapObject, toSourceMapBuilder, emitSourceMapUrl } from "../utility/sourceMap";
import { locationToIndex, indexToLocation, Location } from "../utility/location";
import { begin, end } from "./progress";
import { LogEntry, LogLevel, format, getDisplayName, log, verbose } from "./logging";
import { WriterOptions, Writer, SourceMapWriter, StreamOptions, BufferStream } from "./writer";
import { watcher } from "./watch";

/**
 * 表示一个文件。
 * @remark
 * 文件具体可以是物理文件或动态创建的文件。
 * 一个文件会被若干处理器处理，并在处理完成后一次性写入硬盘。
 */
export class File {

    // #region 路径

    /**
     * 获取当前文件的源路径。
     * @returns 始终返回绝对路径。如果当前文件是动态生成的则返回 undefined。
     */
    readonly srcPath: string;

    /**
     * 获取当前文件的目标路径。
     * @returns 始终返回绝对路径。如果当前文件是动态生成的则返回 undefined。
     */
    get destPath() { return this.path; }

    /**
     * 获取或设置当前文件的基路径。
     */
    base: string;

    /**
     * 获取或设置当前文件的名称。
     * @returns 返回相对于基路径的相对路径，路径中固定以 / 为分隔符。
     */
    name: string;

    /**
     * 获取当前文件的路径。
     * @returns 始终返回绝对路径。如果当前文件是动态生成的则返回 undefined。
     */
    get path() {
        return this.name ? resolvePath(this.base || "", this.name) : undefined;
    }

    /**
     * 设置当前文件的绝对路径。
     */
    set path(value) {
        this.name = relativePath(this.base || "", value);
    }

    /**
     * 获取当前文件的扩展名。
     */
    get ext() { return getExt(this.name); }

    /**
     * 设置当前文件的扩展名。
     */
    set ext(value) { this.name = setExt(this.name, value); }

    /**
     * 获取当前文件的源文件夹。
     */
    get srcDir() { return getDir(this.srcPath); }

    /**
     * 获取当前文件的目标文件夹。
     */
    get destDir() { return getDir(this.destPath); }

    /**
     * 获取当前文件的文件夹。
     */
    get dir() { return getDir(this.path); }

    /**
     * 设置当前文件的文件夹。
     */
    set dir(value) { this.path = setDir(this.path, value); }

    /**
     * 判断当前文件是否是生成的。
     */
    get generated() { return !this.srcPath; }

    /**
     * 判断当前文件是否实际存在。
     */
    get exists() { return this.srcPath && existsFileSync(this.srcPath); }

    /**
     * 初始化新的文件。
     * @param path 源路径。
     * @param base 基路径。
     */
    constructor(path?: string, base?: string) {
        if (base != undefined) {
            this.base = base;
        }
        if (path != undefined) {
            this.path = this.srcPath = resolvePath(path);
        }
    }

    /**
     * 获取当前文件的字符串形式。
     */
    toString() {
        return this.generated ?
            format("(Generated)") + getDisplayName(this.destPath) :
            getDisplayName(this.srcPath);
    }

    /**
     * 提供直接查看当前文件对象的方法。
     * @internal
     */
    private inspect() {
        return "File " + this.toString();
    }

    // #endregion

    // #region 内容

    /**
     * 存储当前文件的源二进制内容。
     */
    private _srcBuffer: Buffer;

    /**
     * 获取当前文件的源二进制内容。
     */
    get srcBuffer() {
        if (this._srcBuffer == undefined) {
            if (this._srcContent == undefined) {
                if (this.srcPath && workingMode !== WorkingMode.clean) {
                    const taskId = begin("Read: {file}", { file: this.toString() });
                    try {
                        this._srcBuffer = readFileSync(this.srcPath);
                    } finally {
                        end(taskId);
                    }
                } else {
                    this._srcBuffer = Buffer.allocUnsafe(0);
                }
            } else {
                this._srcBuffer = stringToBuffer(this._srcContent, this.encoding);
            }
        }
        return this._srcBuffer;
    }

    /**
     * 存储当前文件的源文本内容。
     */
    private _srcContent: string;

    /**
     * 获取当前文件的源文本内容。
     */
    get srcContent() {
        if (this._srcContent == undefined) {
            if (this._srcBuffer == undefined) {
                if (this.srcPath && workingMode !== WorkingMode.clean) {
                    const taskId = begin("Read: {file}", { file: this.toString() });
                    try {
                        this._srcContent = bufferToString(readFileSync(this.srcPath), this.encoding);
                    } finally {
                        end(taskId);
                    }
                } else {
                    this._srcContent = "";
                }
            } else {
                this._srcContent = bufferToString(this._srcBuffer, this.encoding);
            }
        }
        return this._srcContent;
    }

    /**
     * 存储当前文件的目标二进制内容。
     */
    private _destBuffer: Buffer;

    /**
     * 获取当前文件的目标二进制内容。
     */
    get destBuffer() { return this.buffer; }

    /**
     * 存储当前文件的目标文本内容。
     */
    private _destContent: string;

    /**
     * 获取当前文件的目标文本内容。
     */
    get destContent() { return this.content; }

    /**
     * 获取当前文件的最终保存二进制内容。
     */
    get buffer() {
        if (this._destBuffer != undefined) {
            return this._destBuffer;
        }
        if (this._destContent != undefined) {
            return this._destBuffer = stringToBuffer(this._destContent, this.encoding);
        }
        return this.srcBuffer;
    }

    /**
     * 设置当前文件的最终保存二进制内容。
     */
    set buffer(value) {
        this._destBuffer = value;
        delete this._destContent;
        this.setModified();
    }

    /**
     * 获取当前文件的最终保存文本内容。
     */
    get content() {
        if (this._destContent != undefined) {
            return this._destContent;
        }
        if (this._destBuffer != undefined) {
            return this._destContent = bufferToString(this._destBuffer, this.encoding);
        }
        return this.srcContent;
    }

    /**
     * 设置当前文件的最终保存文本内容。
     */
    set content(value) {
        this._destContent = value;
        delete this._destBuffer;
        this.setModified();
    }

    /**
     * 获取当前文件的最终内容。
     */
    get data() { return this._destContent != undefined ? this._destContent : this.buffer; }

    /**
     * 设置当前文件的最终内容。
     */
    set data(value) {
        if (typeof value === "string") {
            this.content = value;
        } else {
            this.buffer = value;
        }
    }

    /**
     * 判断当前文件是否已修改。
     */
    get modified() { return this._destContent != undefined || this._destBuffer != undefined; }

    /**
     * 获取读写当前文件使用的编码。
     */
    get encoding() { return encoding; }

    /**
     * 设置读写当前文件使用的编码。
     */
    set encoding(value) { setProperty(this, "encoding", value); }

    /**
     * 标记当前文件已被修改。
     */
    private setModified() {
        delete this.indexes;
    }

    /**
     * 存储当前文件的每行第一个字符的索引值。
     */
    private indexes: number[];

    /**
     * 计算指定索引对应的行列号。
     * @param index 要检查的索引。
     * @returns 返回对应的行列号。
     */
    indexToLocation(index: number) {
        return indexToLocation(this.content, index, <any>this);
    }

    /**
     * 计算指定行列号对应的索引。
     * @param loc 要检查的行列号。
     * @returns 返回对应的索引。
     */
    locationToIndex(loc: Location) {
        return locationToIndex(this.content, loc, <any>this);
    }

    // #endregion

    // #region 源映射

    /**
     * 判断当前文件是否需要生成源映射。
     */
    get sourceMap() {
        if (sourceMap === true || sourceMap === false) {
            return sourceMap;
        }
        return sourceMap(this);
    }

    /**
     * 设置当前文件是否需要生成源映射。
     */
    set sourceMap(value) { setProperty(this, "sourceMap", value); }

    /**
     * 获取当前文件的源映射保存路径。
     */
    get sourceMapPath() {
        if (sourceMapPath) {
            return sourceMapPath(this);
        }
        return this.destPath + ".map";
    }

    /**
     * 设置当前文件的源映射保存路径。
     */
    set sourceMapPath(value) { setProperty(this, "sourceMapPath", value); }

    /**
     * 获取当前文件的源映射保存文件夹。
     */
    get sourceMapDir() { return getDir(this.sourceMapPath); }

    /**
     * 设置当前文件的源映射保存文件夹。
     */
    set sourceMapDir(value) { this.sourceMapPath = setDir(this.sourceMapPath, value); }

    /**
     * 判断是否在源文件插入 #SourceMappingURL。
     */
    get sourceMapEmit() { return sourceMapEmit; }

    /**
     * 设置是否在源文件插入 #SourceMappingURL。
     */
    set sourceMapEmit(value) { setProperty(this, "sourceMapEmit", value); }

    /**
     * 判断是否内联源映射到源文件。
     * @remark 仅当 sourceMapEmit 为 true 时有效。
     */
    get sourceMapInline() { return sourceMapInline; }

    /**
     * 设置是否内联源映射到源文件。
     * @remark 仅当 sourceMapEmit 为 true 时有效。
     */
    set sourceMapInline(value) { setProperty(this, "sourceMapInline", value); }

    /**
     * 获取在源文件引用源映射的地址。
     * @remark 仅当 sourceMapEmit 为 true 时有效。
     */
    get sourceMapUrl() {
        if (sourceMapUrl) {
            return sourceMapUrl(this);
        }
        return relativePath(this.dir, this.sourceMapPath);
    }

    /**
     * 设置在源文件引用源映射的地址。
     * @remark 仅当 sourceMapEmit 为 true 时有效。
     */
    set sourceMapUrl(value) { setProperty(this, "sourceMapInline", value); }

    /**
     * 获取或设置当前文件的源映射数据。
     * @returns 如果不存在源映射数据则返回 undefined。
     */
    sourceMapData: SourceMapData;

    /**
     * 获取当前文件的源映射构建器。
     * @returns 如果不存在源映射数据则返回 undefined。
     */
    get sourceMapBuilder() {
        if (!this.sourceMapData) {
            return;
        }
        return this.sourceMapData = toSourceMapBuilder(this.sourceMapData);
    }

    /**
     * 应用指定的源映射。如果当前文件已经存在源映射则进行合并。
     * @param sourceMapData 要应用的源映射。
     */
    applySourceMap(sourceMapData: SourceMapData) {
        if (sourceMapData) {
            if (this.sourceMapData) {
                this.sourceMapBuilder.applySourceMap(toSourceMapBuilder(sourceMapData));
            } else {
                this.sourceMapData = sourceMapData;
            }
        }
        return this;
    }

    /**
     * 获取当前文件的源映射对象。
     * @returns 如果不存在源映射数据则返回 undefined。
     */
    get sourceMapObject() {
        if (!this.sourceMapData) {
            return;
        }
        const sourceMapObject = toSourceMapObject(this.sourceMapData);

        // 生成最终的 sourceMap 数据。
        const result: SourceMapObject = {
            version: sourceMapObject.version || 3,
            sources: [],
            mappings: sourceMapObject.mappings || ""
        };

        // file。
        if (this.sourceMapIncludeFile) {
            result.file = relativePath(getDir(this.sourceMapPath), this.destPath);
        }

        // sourceRoot。
        const sourceRoot = this.sourceMapRoot || sourceMapObject.sourceRoot;
        if (sourceRoot) {
            result.sourceRoot = sourceRoot;
        }

        // sources。
        for (let i = 0; i < sourceMapObject.sources.length; i++) {
            result.sources[i] = sourceMapSource ?
                sourceMapSource(sourceMapObject.sources[i], this) :
                relativePath(this.sourceMapDir, sourceMapObject.sources[i]);
        }

        // sourcesContent。
        if (this.sourceMapIncludeSourcesContent) {
            result.sourcesContent = [];
            for (let i = 0; i < sourceMapObject.sources.length; i++) {
                result.sourcesContent[i] = sourceMapSourceContent ?
                    sourceMapSourceContent(sourceMapObject.sources[i], this) :
                    sourceMapObject.sourcesContent ?
                        sourceMapObject.sourcesContent[i] :
                        (sourceMapObject.sources[i] === this.srcPath ? this.srcContent : bufferToString(readFileSync(sourceMapObject.sources[i]), encoding));
            }
        }

        // names。
        if (this.sourceMapIncludeNames && sourceMapObject.names && sourceMapObject.names.length) {
            result.names = sourceMapObject.names;
        }

        // 验证源映射。
        if (onValidateSourceMap) {
            onValidateSourceMap(result, this);
        }

        return result;
    }

    /**
     * 获取当前文件的源映射字符串。
     */
    get sourceMapString() { return JSON.stringify(this.sourceMapObject); }

    /**
     * 判断是否在源映射插入 file 段。
     */
    get sourceMapIncludeFile() { return sourceMapIncludeFile; }

    /**
     * 设置是否在源映射插入 file 段。
     */
    set sourceMapIncludeFile(value) { setProperty(this, "sourceMapIncludeFile", value); }

    /**
     * 获取源映射中的 sourceRoot 内容。
     */
    get sourceMapRoot() { return sourceMapRoot; }

    /**
     * 设置源映射中的 sourceRoot 内容。
     */
    set sourceMapRoot(value) { setProperty(this, "sourceMapRoot", value); }

    /**
     * 判断是否在源映射插入 sourcesContent 段。
     */
    get sourceMapIncludeSourcesContent() { return sourceMapIncludeSourcesContent; }

    /**
     * 设置是否在源映射插入 sourcesContent 段。
     */
    set sourceMapIncludeSourcesContent(value) { setProperty(this, "sourceMapIncludeSourcesContent", value); }

    /**
     * 判断是否在源映射插入 names 段。
     */
    get sourceMapIncludeNames() { return sourceMapIncludeNames; }

    /**
     * 设置是否在源映射插入 names 段。
     */
    set sourceMapIncludeNames(value) { setProperty(this, "sourceMapIncludeNames", value); }

    // #endregion

    // #region 读写

    /**
     * 异步载入当前文件内容。
     * @param callback 操作完成后的回调函数。
     */
    load(callback?: (error: NodeJS.ErrnoException, file: File) => void) {

        // 文件已载入。
        if (!this.srcPath || this._destContent != undefined || this._destBuffer != undefined || this._srcBuffer != undefined || this._srcContent != undefined || workingMode === WorkingMode.clean) {
            callback && callback(null, this);
            return this;
        }

        // 异步载入文件。
        const taskId = begin("Read: {file}", { file: this.toString() });
        readFile(this.srcPath, (error, data) => {
            end(taskId);
            this._srcBuffer = data || Buffer.allocUnsafe(0);
            callback && callback(error, this);
        });

        return this;

    }

    /**
     * 异步保存当前文件到指定路径。
     * @param dir 要保存的目标文件夹路径。如果为空则保存到当前文件夹。
     * @param callback 操作完成后的回调函数。
     */
    save(dir?: string, callback?: (error: NodeJS.ErrnoException, file: File) => void) {

        // 更新基路径。
        if (dir) this.base = resolvePath(dir);

        // 验证文件。
        if (onFileValidate && onFileValidate(this) === false) {
            callback && callback(null, this);
            return this;
        }

        // 验证路径。
        const savePath = this.path;
        const sourceMapEmit = this.sourceMapData && this.sourceMapEmit;
        const modified = this.modified || sourceMapEmit;
        if (pathEquals(this.srcPath, savePath)) {

            // 文件未修改，跳过保存。
            if (!modified) {
                callback && callback(null, this);
                return this;
            }

            // 不允许覆盖源文件。
            if (!this.overwrite) {
                const error = <NodeJS.ErrnoException>new Error("Cannot overwrite source file. Use '--overwrite' to force saving.");
                error.code = "EEXIST";
                error.errno = "17";
                callback && callback(error, this);
                return this;
            }

        }

        // 保存完成后的回调。
        const sourceMapPath = this.sourceMapData && !this.sourceMapInline && this.sourceMapPath;
        let taskId: string;
        const args = { file: this.toString() };
        let firstError: NodeJS.ErrnoException;
        let pending = 1;
        const done = (error: NodeJS.ErrnoException) => {
            firstError = firstError || error;
            if (--pending > 0) return;
            end(taskId);
            if (!error) {
                fileCount++;
                if (watcher && this.deps) {
                    watcher.deps[this.srcPath] = this.deps;
                    for (const p of this.deps) {
                        watcher.add(p);
                    }
                }
                if (onFileSave) {
                    onFileSave(this);
                }
            }
            callback && callback(firstError, this);
        };

        switch (workingMode) {

            // 生成文件。
            case WorkingMode.build:
                if (sourceMapEmit) {
                    taskId = begin("Save: {file}", args);
                    writeFile(savePath, stringToBuffer(emitSourceMapUrl(this.content, this.sourceMapInline ? base64Uri("application/json", this.sourceMapString) : this.sourceMapUrl, /\.js$/i.test(this.name)), this.encoding), done);
                } else {
                    if (modified) {
                        taskId = begin("Save: {file}", args);
                        writeFile(savePath, this._destBuffer || stringToBuffer(this._destContent, this.encoding), done);
                    } else if (this.srcPath) {
                        taskId = begin("Copy: {file}", args);
                        copyFile(this.srcPath, savePath, done);
                    } else {
                        taskId = begin("Save: {file}", args);
                        writeFile(savePath, Buffer.allocUnsafe(0), done);
                    }
                }
                if (sourceMapPath) {
                    pending++;
                    writeFile(sourceMapPath, this.sourceMapString, done);
                }
                break;

            case WorkingMode.clean:
                taskId = begin("Clean: {file}", args);
                deleteFile(savePath, error => {
                    if (error) {
                        return done(error.code === "EPERM" ? null : error);
                    }
                    deleteParentDirIfEmpty(savePath, done);
                });
                if (sourceMapPath) {
                    pending++;
                    deleteFile(sourceMapPath, error => {
                        if (error) {
                            return done(error.code === "EPERM" ? null : error);
                        }
                        deleteParentDirIfEmpty(sourceMapPath, done);
                    });
                }
                break;

            // 预览文件。
            default:
                taskId = begin("Preview Save: {file}", args);
                done(null);
                break;
        }

        return this;
    }

    /**
     * 删除当前源文件。
     * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
     * @param callback 操作完成后的回调函数。
     */
    delete(deleteDir?: boolean, callback?: (error: NodeJS.ErrnoException, file: File) => void) {

        // 验证路径。
        if (!this.srcPath) {
            callback && callback(null, this);
            return this;
        }

        // 如果删除了源文件则允许覆盖写入。
        if (pathEquals(this.srcPath, this.path)) {
            this.overwrite = true;
        }

        let taskId: string;
        const args = { file: this.toString() };
        const done = (error: NodeJS.ErrnoException) => {
            end(taskId);
            if (!error) {
                fileCount++;
                if (onFileDelete) {
                    onFileDelete(this);
                }
            }
            callback && callback(error, this);
        };

        // 预览模式不写入硬盘。
        if (workingMode === WorkingMode.preview) {
            taskId = begin("Preview Delete: {file}", args);
            done(null);
            return this;
        }

        // 删除文件。
        taskId = begin("Delete: {file} ", args);
        deleteFile(this.srcPath, error => {
            if (error) {
                return done(error);
            }
            if (deleteDir !== false) {
                deleteParentDirIfEmpty(this.srcPath, done);
            } else {
                done(null);
            }
        });
        return this;
    }

    /**
     * 获取是否允许覆盖源文件。
     */
    get overwrite() { return overwrite; }

    /**
     * 设置是否允许覆盖源文件。
     */
    set overwrite(value) { setProperty(this, "overwrite", value); }

    // #endregion

    // #region 日志

    /**
     * 获取当前文件累积的错误数。
     */
    errorCount: number;

    /**
     * 获取当前文件累积的警告数。
     */
    warningCount: number;

    /**
     * 记录一条和当前文件相关的日志。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     * @param level 要记录的日志等级。
     */
    log(data: string | Error | FileLogEntry, args?: Object, level = LogLevel.log) {
        if (!(data instanceof LogEntry)) {
            data = new FileLogEntry(this, data, args);
        }
        if (onFileLog && onFileLog(this, data, level) === false) {
            return this;
        }
        switch (level) {
            case LogLevel.error:
            case LogLevel.fatal:
                this.errorCount = ++this.errorCount || 1;
                break;
            case LogLevel.warning:
                this.warningCount = ++this.warningCount || 1;
                break;
        }
        log(data, undefined, level);
        return this;
    }

    /**
     * 记录生成当前文件时出现的错误。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    error(data?: string | Error | FileLogEntry, args?: Object) { return this.log(data, args, LogLevel.error); }

    /**
     * 记录生成当前文件时出现的警告。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    warning(data?: string | Error | FileLogEntry, args?: Object) { return this.log(data, args, LogLevel.warning); }

    /**
     * 记录生成当前文件时的详细信息。
     * @param data 要记录的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    verbose(data?: string | Error | FileLogEntry, args?: Object) { return this.log(data, args, LogLevel.verbose); }

    // #endregion

    // #region 依赖

    /**
     * 获取当前文件已添加的依赖。
     */
    deps: string[];

    /**
     * 添加当前文件的依赖。
     * @param path 相关的路径。
     * @param source 当前依赖的来源。
     */
    dep(path: string | string[], source?: LogEntry) {
        if (Array.isArray(path)) {
            for (const p of path) {
                this.dep(p, source);
            }
            return;
        }
        if (typeof path === "string") {
            path = resolvePath(path);
            if (onFileDep && onFileDep(this, path, source) === false) {
                return;
            }
            this.deps = this.deps || [];
            this.deps.push(path);
        }
    }

    /**
     * 获取当前文件已添加的引用。
     */
    refs: string[];

    /**
     * 添加当前文件的引用项。
     * @param path 相关的路径。
     * @param source 当前引用的来源。
     */
    ref(path: string | string[], source?: LogEntry) {
        if (Array.isArray(path)) {
            for (const p of path) {
                this.ref(p, source);
            }
            return;
        }
        if (typeof path === "string") {
            path = resolvePath(path);
            if (onFileRef && onFileRef(this, path, source) === false) {
                return;
            }
            this.refs = this.refs || [];
            this.refs.push(path);
        }
    }

    // #endregion

    // #region 写入器

    /**
     * 创建一个文本写入器。
     * @param options 写入器的配置。
     */
    createWriter(options?: WriterOptions) {
        return (options && options.sourceMap != undefined ? options.sourceMap : this.sourceMap) ? new SourceMapWriter(this, options) : new Writer(this, options);
    }

    /**
     * 创建一个二进制写入流。
     * @param options 写入流的配置。
     */
    createStream(options?: StreamOptions) {
        return new BufferStream(this, options);
    }

    // #endregion

    // #region 工具

    /**
     * 获取当前文件的信息。
     */
    get stats() { return getStatSync(this.srcPath); }

    /**
     * 测试当前文件名是否匹配指定的匹配器。
     * @param matcher 要测试通配符、正则表达式、函数或以上的匹配器组成的数组。
     * @returns 如果匹配则返回 true，否则返回 false。
     */
    match(matcher: Pattern) { return new Matcher(matcher).test(this.path); }

    /**
     * 解析当前文件内的地址所表示的实际地址。
     * @param url 要解析的地址。如 `../a.js?a=1`。
     * @returns 返回解析好的绝对地址。
     */
    resolve(url: string) { return resolveUrl(this.srcPath, url); }

    /**
     * 获取在当前文件内引用指定地址或文件所使用的相对地址。
     * @param url 要解析的地址或文件。
     */
    relative(url: string | File) {
        return relativeUrl(this.path, url instanceof File ? url.path : url);
    }

    /**
     * 创建当前文件的副本。
     * @return 返回新文件对象。
     */
    clone() {
        const result: File = <any>{ __proto__: (<any>this).__proto__ };
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                const value = this[key];
                if (value instanceof Buffer) {
                    result[key] = new Buffer(value.length);
                    value.copy(result[key]);
                    continue;
                }
                result[key] = value;
            }
        }
        return result;
    }

    // #endregion

}

/**
 * 获取或设置读写文件使用的默认编码。
 */
export var encoding = "utf-8";

/**
 * 获取或设置是否允许覆盖源文件。
 */
export var overwrite = false;

/**
 * 获取或设置是否启用源映射。
 */
export var sourceMap: boolean | ((file: File) => boolean) = false;

/**
 * 获取或设置用于计算每个文件的源映射路径的回调函数。
 * @param file 当前相关的文件。
 * @return 返回源映射的绝对路径。
 */
export var sourceMapPath: (file: File) => string = null;

/**
 * 获取或设置用于计算每个文件的源映射地址的回调函数。
 * @param file 当前相关的文件。
 * @return 返回源映射地址。
 */
export var sourceMapUrl: (file: File) => string = null;

/**
 * 获取或设置用于计算源映射中指定源文件地址的回调函数。
 * @param source 要计算的源文件地址。
 * @param file 当前相关的文件。
 * @return 返回对应的源文件地址。
 */
export var sourceMapSource: (source: string, file: File) => string = null;

/**
 * 获取或设置用于计算源映射中指定源文件内容的回调函数。
 * @param source 要计算的源文件地址。
 * @param file 当前相关的文件。
 * @return 返回对应的源文件内容。
 */
export var sourceMapSourceContent: (source: string, file: File) => string = null;

/**
 * 获取或设置是否在源文件中内联源映射。
 */
export var sourceMapInline = false;

/**
 * 获取或设置是否在源文件追加对源映射的引用注释。
 */
export var sourceMapEmit = true;

/**
 * 获取或设置源映射中引用源的跟地址。
 */
export var sourceMapRoot = "";

/**
 * 获取或设置是否在源映射插入 sourcesContent 段。
 */
export var sourceMapIncludeSourcesContent = false;

/**
 * 获取或设置是否在源映射插入 file 段。
 */
export var sourceMapIncludeFile = true;

/**
 * 获取或设置是否在源映射插入 names 段。
 */
export var sourceMapIncludeNames = true;

/**
 * 获取或设置生成文件源映射的回调函数。
 * @param sourceMap 当前的源映射对象。
 * @param file 当前相关的文件。
 */
export var onValidateSourceMap: (sourceMap: SourceMapObject, file: File) => void = null;

/**
 * 表示工作模式。
 */
export const enum WorkingMode {

    /**
     * 生成模式。
     */
    build,

    /**
     * 清理模式。
     */
    clean,

    /**
     * 预览模式。
     */
    preview,

}

/**
 * 获取当前工作模式。
 */
export var workingMode = WorkingMode.build;

/**
 * 获取或设置即将保存文件时的回调函数。
 * @param file 当前相关的文件。
 * @returns 如果函数返回 false，则不保存此文件。
 */
export var onFileValidate: (file: File) => boolean | void = null;

/**
 * 获取或设置保存文件后的回调函数。
 * @param file 当前相关的文件。
 */
export var onFileSave: (file: File) => void = null;

/**
 * 获取或设置当删除文件后的回调函数。
 * @param file 当前相关的文件。
 */
export var onFileDelete: (file: File) => void = null;

/**
 * 获取已处理的文件数。
 */
export var fileCount = 0;

/**
 * 获取或设置是否允许系统使用源映射信息。
 */
export var evalSourceMap = true;

/**
 * 表示处理文件时产生的日志项。
 */
export class FileLogEntry extends LogEntry {

    /**
     * 获取源文件对象。
     */
    file?: File;

    /**
     * 获取是否允许执行源映射。
     */
    sourceMap?: boolean;

    /**
     * 获取源映射数据。
     */
    sourceMapData?: SourceMapData;

    /**
     * 初始化新的日志项。
     * @param file 当前正在生成的文件。
     * @param data 要处理的日志数据。
     * @param args 格式化参数。日志信息中 `{x}` 会被替换为 `args.x` 的值。
     */
    constructor(file: File, data: string | Error | LogEntry, args?: Object) {
        super(data, args);

        // 统一文件对象。
        if (!this.file) {
            this.file = this.path && !pathEquals(this.path, file.srcPath) ? new File(this.path, file.base) : file;
        }

        // 从文件提取信息。
        if (this.path == undefined) this.path = this.file.srcPath;
        if (this.sourceMapData == undefined && this.file.sourceMapData) this.sourceMapData = this.file.sourceMapData;

        // 从源映射提取信息。
        if (evalSourceMap && this.sourceMap !== false && this.startLine != undefined && this.sourceMapData) {
            const sourceMapBuilder = this.sourceMapData = toSourceMapBuilder(this.sourceMapData);
            const startSource = sourceMapBuilder.getSource(this.startLine, this.startColumn || 0);
            if (!pathEquals(this.path, startSource.sourcePath)) {
                this.path = startSource.sourcePath;
                this.content = startSource.sourceContent;
                this.file = new File(this.path, file.base);
            }
            this.startLine = startSource.line;
            this.startColumn = startSource.column;

            if (this.endLine != undefined) {
                const endSource = sourceMapBuilder.getSource(this.endLine, this.endColumn || 0);
                if (pathEquals(this.path, endSource.sourcePath)) {
                    this.endLine = endSource.line;
                    this.endColumn = endSource.column;
                } else {
                    delete this.endLine;
                    delete this.endColumn;
                }
            }
        }

        // 自动生成代码片段。
        if (this.content == undefined && this.sourceContent == undefined && this.startLine != undefined) {
            try {
                this.content = this.file.content;
            } catch (e) {
                verbose(e);
            }
        }

    }

}

/**
 * 获取或设置处理文件时产生日志的回调函数。
 * @param log 要记录的日志项。
 * @param level 要记录的日志等级。
 * @param file 当前正在生成的文件。
 * @returns 如果函数返回 false，则忽略当前日志。
 */
export var onFileLog: (file: File, log: FileLogEntry, level: LogLevel) => boolean | void = null;

/**
 * 获取或设置处理文件时发现依赖的回调函数。
 * @param file 当前正在生成的文件。
 * @param path 要依赖的文件路径。
 * @param source 要依赖的文件路径。
 * @returns 如果函数返回 false，则忽略当前依赖。
 */
export var onFileDep: (file: File, path: string, source?: LogEntry) => boolean | void = null;

/**
 * 获取或设置处理文件时发现引用的回调函数。
 * @param file 当前正在生成的文件。
 * @param path 要引用的文件路径。
 * @param source 要引用的文件路径。
 * @returns 如果函数返回 false，则忽略当前引用。
 */
export var onFileRef: (file: File, path: string, source?: LogEntry) => boolean | void = null;
