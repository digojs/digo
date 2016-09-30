/**
 * @fileOverview 文件
 * @author xuld <xuld@vip.qq.com>
 */
import { setProperty } from "../utility/object";
import { resolvePath, relativePath, getDir, changeDir, getExt, changeExt, inDir, pathEquals } from "../utility/path";
import { resolveUrl, relativeUrl } from "../utility/url";
import { stringToBuffer, bufferToString, base64Uri } from "../utility/encode";
import { readFileSync, existsFileSync, getStatSync } from "../utility/fs-sync";
import { readFile, writeFile, copyFile, deleteFile, deleteParentDirIfEmpty } from "../utility/fs";
import { Pattern, Matcher } from "../utility/matcher";
import { SourceMapData, SourceMapObject, SourceMapBuilder, toSourceMapObject, toSourceMapBuilder, emitSourceMapUrl } from "../utility/sourceMap";
import { WriterOptions, Writer, SourceMapWriter, StreamOptions, BufferStream } from "./writer";
import { beginAsync, endAsync } from "./async";
import { LogData, LogLevel, format, getDisplayName, log } from "./logging";
import { cache, updateCache } from "./cache";
import { watcher } from "./watch";

/**
 * 表示一个文件。
 * @remark
 * 文件具体可以是物理文件或动态创建的文件。
 * 一个文件会被若干处理器处理，并在处理完成后一次性写入硬盘。
 */
export class File {

    // #region 初始化

    /**
     * 初始化新的文件。
     * @param srcName 文件的源名称。
     * @param destName 文件的目标名称。
     * @param data 文件的数据。
     */
    constructor(srcName?: string, destName?: string, data?: string | Buffer) {
        this.srcName = srcName;
        this.destName = destName || srcName;
        if (data != undefined) {
            this.data = data;
        } else if (workingMode & WorkingMode.clean) {
            this.buffer = Buffer.allocUnsafeSlow(0);
        }
    }

    /**
     * 提供直接查看当前文件对象的方法。
     */
    private inspect() {
        return "File " + this.toString();
    }

    // #endregion

    // #region 路径

    /**
     * 获取当前文件的源名称。如果当前文件是生成的则返回空。
     */
    srcName: string;

    /**
     * 获取当前文件的源路径。
     */
    get srcPath() { return this.srcName ? resolvePath(this.srcName) : ""; }

    /**
     * 获取当前文件的目标名称。
     */
    destName: string;

    /**
     * 获取当前文件的目标路径。
     */
    get destPath() { return this.destName ? resolvePath(this.destName) : ""; }

    /**
     * 获取当前文件的名称。
     */
    get name() { return this.destName; }

    /**
     * 设置当前文件的名称。
     */
    set name(value) { this.destName = value; }

    /**
     * 获取当前文件的路径。
     */
    get path() { return this.destName ? resolvePath(this.destName) : ""; }

    /**
     * 设置当前文件的路径。
     */
    set path(value) { this.destName = relativePath(value); }

    /**
     * 判断当前文件是否是生成的。
     */
    get generated() { return !this.srcName; }

    /**
     * 获取当前文件的字符串形式。
     */
    toString() {
        return this.generated ?
            format("(Generated)") + getDisplayName(this.destName) :
            getDisplayName(this.srcName);
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
                if (this.srcName) {
                    const taskId = beginAsync("Read: {file}", { file: this.toString() });
                    this._srcBuffer = readFileSync(this.srcName);
                    endAsync(taskId);
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
                if (this.srcName) {
                    const taskId = beginAsync("Read: {file}", { file: this.toString() });
                    this._srcContent = bufferToString(readFileSync(this.srcName), this.encoding);
                    endAsync(taskId);
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
     * 获取读写当前文件使用的编码。
     */
    get encoding() { return encoding; }

    /**
     * 设置读写当前文件使用的编码。
     */
    set encoding(value) { setProperty(this, "encoding", value); }

    /**
     * 获取是否允许覆盖源文件。
     */
    get overwrite() { return overwrite; }

    /**
     * 设置是否允许覆盖源文件。
     */
    set overwrite(value) { setProperty(this, "overwrite", value); }

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
     * 标记当前文件已被修改。
     */
    private setModified() {
        delete this._indexes;
    }

    // #endregion

    // #region 读写

    /**
     * 异步载入当前文件内容。
     * @param callback 操作完成后的回调函数。
     */
    load(callback?: (error: NodeJS.ErrnoException, file: File) => void) {

        // 文件已载入。
        if (!this.srcName || this._destContent != undefined || this._destBuffer != undefined || this._srcBuffer != undefined || this._srcContent != undefined) {
            callback && callback(null, this);
            return this;
        }

        // 异步载入文件。
        const taskId = beginAsync("Read: {file}", { file: this.toString() });
        readFile(this.srcName, (error, data) => {
            if (error) {
                this.error(error);
            } else {
                this._srcBuffer = data;
            }
            callback && callback(error, this);
            endAsync(taskId);
        });

        return this;

    }

    /**
     * 异步保存当前文件到指定路径。
     * @param path 要保存的目标文件路径。如果为空则不更改文件的路径。
     * @param callback 操作完成后的回调函数。
     */
    save(path?: string, callback?: (error: NodeJS.ErrnoException, file: File) => void) {

        // 检查是否重复写入。
        const savePath = path ? resolvePath(path) : this.path;
        if (onValidateFile && !onValidateFile(this, savePath)) {
            callback && callback(null, this);
            return this;
        }

        // 判断是否覆盖源文件。
        const sourceMapUrl = this.sourceMap && this.sourceMapData && this.sourceMapEmit && (this.sourceMapInline ? base64Uri("application/json", this.sourceMapString) : this.sourceMapUrl);
        const modified = this.modified || sourceMapUrl;
        const srcPath = this.srcPath;
        if (pathEquals(srcPath, savePath)) {

            // 文件未修改，不作操作。
            if (!modified) {
                callback && callback(null, this);
                return this;
            }

            // 不允许覆盖源文件。
            if (!this.overwrite) {
                this.error("Cannot overwrite source file. Use '--overwrite' to force saving.");
                const error = <NodeJS.ErrnoException>new Error("EEXIST, file already exists.");
                error.code = "EEXIST";
                error.errno = 17;
                callback && callback(error, this);
                return this;
            }

        }

        const sourceMapPath = this.sourceMap && !this.sourceMapInline && this.sourceMapPath;
        const done = (error: NodeJS.ErrnoException) => {
            if (error) {
                this.error(error);
            } else {
                fileCount++;
                if (onSaveFile) {
                    onSaveFile(this, savePath);
                }
            }
            callback && callback(error, this);
            endAsync(taskId);
        };
        const args = { file: getDisplayName(savePath) };

        // 清理文件。
        if (workingMode & WorkingMode.clean) {
            var taskId = beginAsync("Clean: {file}", args);
            deleteFile(savePath, error => {
                if (error) {
                    return done(error);
                }
                deleteParentDirIfEmpty(savePath, error => {
                    if (sourceMapPath) {
                        deleteFile(sourceMapPath, error => {
                            if (error) {
                                return done(error);
                            }
                            deleteParentDirIfEmpty(sourceMapPath, done);
                        });
                    } else {
                        done(null);
                    }
                });
            });
        } else if (workingMode & WorkingMode.preview) {
            var taskId = beginAsync("Preview: {file}", args);
            done(null);
        } else {
            const callback = sourceMapPath && this.sourceMapData ? (error: NodeJS.ErrnoException) => {
                if (error) {
                    return done(error);
                }
                writeFile(sourceMapPath, stringToBuffer(this.sourceMapString, "utf-8"), cache ? (error: NodeJS.ErrnoException) => {
                    if (error) {
                        return done(error);
                    }
                    updateCache(srcPath, sourceMapPath);
                } : done);
            } : cache ? (error: NodeJS.ErrnoException) => {
                if (error) {
                    return done(error);
                }
                updateCache(srcPath, savePath);
            } : done;
            if (modified) {
                const data = sourceMapUrl ? stringToBuffer(emitSourceMapUrl(this.content, sourceMapUrl, /\.js$/i.test(this.name)), this.encoding) : this._destBuffer || stringToBuffer(this._destContent, this.encoding);
                var taskId = beginAsync("Save: {file}", args);
                writeFile(savePath, data, callback);
            } else {
                var taskId = beginAsync("Copy: {file}", args);
                copyFile(srcPath, savePath, callback);
            }
        }

        return this;
    }

    /**
     * 删除当前源文件。
     * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
     * @param callback 操作完成后的回调函数。
     */
    delete(deleteDir?: boolean, callback?: (error: NodeJS.ErrnoException, file: File) => void) {
        if (!this.srcName) {
            callback && callback(null, this);
            return this;
        }
        const taskId = beginAsync("Delete: {file} ", { file: this.toString() });
        const done = (error: NodeJS.ErrnoException) => {
            if (error) {
                this.error(error);
            } else {
                fileCount++;
                if (onDeleteFile) {
                    onDeleteFile(this);
                }
            }
            callback && callback(error, this);
            endAsync(taskId);
        };
        deleteFile(this.srcName, error => {
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
     * 记录一条日志。
     * @param logData 要记录的日志。
     * @param logLevel 日志等级。
     */
    log(logData: string | Error | FileLogData, logLevel = LogLevel.log) {

        const fileLog = typeof logData === "string" ? { message: logData } :
            logData instanceof Error ? { error: logData } :
                logData instanceof String ? { message: logData.toString() } :
                    logData;

        if (fileLog.error) {
            const error: any = fileLog.error;
            if (fileLog.message == undefined) fileLog.message = error.message || error.msg || error.description || error.toString();
            if (fileLog.fileName == undefined) fileLog.fileName = error.fileName || error.filename || error.filepath || error.path || error.file || error.source;
            if (fileLog.startLine == undefined) {
                const line = +(error.startLine || error.line || error.linenumber || error.lineno || error.row);
                if (line > 0) {
                    fileLog.startLine = line - 1;
                }
            }
            if (fileLog.startLine != undefined && fileLog.startColumn == undefined) {
                const column = +(error.startColumn + 1 || error.column + 1 || error.col + 1 || error.colno + 1);
                if (column > 0) {
                    fileLog.startColumn = column - 1;
                }
            }
        }

        fileLog.fileName = fileLog.fileName ? resolvePath(fileLog.fileName) : fileLog.file != undefined ? fileLog.file.srcPath : this.srcPath;
        if (fileLog.file == undefined && pathEquals(fileLog.fileName, this.srcPath)) fileLog.file = this;

        // 尝试使用源映射查找源码。
        if (fileLog.evalSourceMap !== false && fileLog.startLine != undefined && fileLog.file && fileLog.file.sourceMapBuilder) {
            fileLog.evalSourceMap = false;
            const start = fileLog.file.sourceMapBuilder.getSource(fileLog.startLine, fileLog.startColumn || 0);
            fileLog.fileName = start.sourcePath;
            fileLog.file = pathEquals(fileLog.fileName, this.srcPath) ? this : undefined;
            fileLog.sourceContent = start.sourceContent != undefined ? start.sourceContent : fileLog.file != undefined ? fileLog.file.srcContent : undefined;
            fileLog.startLine = start.line;
            fileLog.startColumn = start.column;

            if (fileLog.endLine != undefined) {
                const end = fileLog.file.sourceMapBuilder.getSource(fileLog.endLine, fileLog.endColumn || 0);
                if (pathEquals(start.sourcePath, end.sourcePath)) {
                    fileLog.endLine = end.line + 1;
                    fileLog.endColumn = end.column + 1;
                } else {
                    delete fileLog.endLine;
                    delete fileLog.endColumn;
                }
            }
        }

        // 报告错误。
        switch (logLevel) {
            case LogLevel.error:
            case LogLevel.fatal:
                if (this.errorCount) this.errorCount++;
                else this.errorCount = 1;
                break;
            case LogLevel.warning:
                if (this.warningCount) this.warningCount++;
                else this.warningCount = 1;
                break;
        }

        if (onLogFile && onLogFile(this, fileLog, logLevel) === false) {
            return this;
        }

        log(logData, undefined, logLevel);
        return this;
    }

    /**
     * 记录生成当前文件时出现的错误。
     * @param logData 要记录的日志。
     */
    error(logData?: string | Error | FileLogData) { return this.log(logData, LogLevel.error); }

    /**
     * 记录生成当前文件时出现的警告。
     * @param logData 要记录的日志。
     */
    warning(logData?: string | Error | FileLogData) { return this.log(logData, LogLevel.warning); }

    // #endregion

    // #region 源映射

    /**
     * 判断当前文件是否需要生成源映射。
     */
    get sourceMap() {
        return sourceMap && (evalSourceMap || saveSourceMap && saveSourceMap.test(this.name));
    }

    /**
     * 设置当前文件是否需要生成源映射。
     */
    set sourceMap(value) { setProperty(this, "sourceMap", value); }

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
        return relativePath(this.destName, this.sourceMapPath);
    }

    /**
     * 设置在源文件引用源映射的地址。
     * @remark 仅当 sourceMapEmit 为 true 时有效。
     */
    set sourceMapUrl(value) { setProperty(this, "sourceMapInline", value); }

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
    set sourceMapDir(value) { this.sourceMapPath = changeDir(this.sourceMapPath, value); }

    /**
     * 获取或设置当前文件的源映射数据。
     */
    sourceMapData: SourceMapData;

    /**
     * 获取当前文件的源映射对象。
     */
    get sourceMapObject() {
        if (!this.sourceMapData) {
            return;
        }

        // 生成最终的 sourceMap 数据。
        const sourceMapObject = toSourceMapObject(this.sourceMapData);
        const result: SourceMapObject = {
            version: sourceMapObject.version || 3,
            sources: sourceMapObject.sources || [],
            mappings: sourceMapObject.mappings || ""
        };

        const sourceMapDir = this.sourceMapDir;

        // file。
        if (this.sourceMapIncludeFile) {
            result.file = relativePath(sourceMapDir, sourceMapObject.file || this.destName);
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
                sourceRoot ?
                    relativePath(sourceMapObject.sources[i]) :
                    relativePath(sourceMapDir, sourceMapObject.sources[i]);
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
        if (validateSourceMap) {
            validateSourceMap(result, this);
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

    /**
     * 获取当前文件的源映射构建器。
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

    // #endregion

    // #region 行列号

    /**
     * 存储当前文件的每行第一个字符的索引值。
     */
    private _indexes: number[];

    /**
     * 存储当前查找行列号的游标。
     */
    private _indexesCursor: number;

    /**
     * 计算指定索引对应的行列号。
     * @param index 要检查的索引。
     * @returns 返回对应的行列号。
     */
    indexToLocation(index: number): Location {
        if (!(index > 0)) return { line: 0, column: 0 };
        const indexes = this._indexes || this.buildIndex();
        let cursor = this._indexesCursor;

        // 确保游标所在位置在大于索引的最小位置。
        while (indexes[cursor] <= index) cursor++;
        while (cursor >= indexes.length || indexes[cursor] > index) cursor--;

        // 更新游标并返回位置。
        this._indexesCursor = cursor;
        return { line: cursor, column: index - indexes[cursor] };
    }

    /**
     * 计算指定行列号对应的索引。
     * @param loc 要检查的行列号。
     * @returns 返回对应的索引。
     */
    locationToIndex(loc: Location) {
        const indexes = this._indexes || this.buildIndex();
        if (loc.line < 0) {
            return 0;
        }
        if (loc.line < indexes.length) {
            return indexes[loc.line] + loc.column;
        }
        return this.content.length;
    }

    /**
     * 生成索引数据。
     */
    private buildIndex() {
        const content = this.content;
        const result = this._indexes = [0];
        this._indexesCursor = 0;
        for (let i = 0; i < content.length; i++) {
            let ch = content.charCodeAt(i);
            if (ch === 13/*\r*/) {
                if (content.charCodeAt(i + 1) === 10/*\n*/) {
                    i++;
                }
                ch = 10;
            }
            if (ch === 10/*\n*/) {
                result.push(i + 1);
            }
        }
        return result;
    }

    // #endregion

    // #region 依赖

    /**
     * 添加当前文件的依赖项。
     * @param path 相关的路径。
     * @param source 设置当前依赖的来源以方便调试。
     */
    dep(path: string | string[], source?: LogData) {
        if (!watcher) return;
        if (typeof path === "string") {
            watcher.addDep(this.srcName, resolvePath(path), source);
        } else {
            for (const p of path) {
                this.dep(p, source);
            }
        }
    }

    /**
     * 添加当前文件的引用项。
     * @param path 相关的路径。
     * @param source 设置当前依赖的来源以方便调试。
     */
    ref(path: string | string[], source?: LogData) {
        if (!watcher) return;
        if (typeof path === "string") {
            watcher.addRef(this.srcPath, resolvePath(path), source);
        } else {
            for (const p of path) {
                this.ref(p, source);
            }
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
     * 获取当前文件的扩展名。
     */
    get extension() { return getExt(this.name); }

    /**
     * 设置当前文件的扩展名。
     */
    set extension(value) { this.name = changeExt(this.name, value); }

    /**
     * 获取当前文件的源文件夹。
     */
    get srcDir() { return getDir(this.srcPath); }

    /**
     * 获取当前文件的目标文件夹。
     */
    get destDir() { return getDir(this.destPath); }

    /**
     * 获取当前文件的最终文件夹。
     */
    get dir() { return getDir(this.srcPath); }

    /**
     * 设置当前文件的最终文件夹。
     */
    set dir(value) { this.path = changeDir(this.path, value); }

    /**
     * 判断当前文件是否实际存在。
     */
    get exists() { return existsFileSync(this.srcPath); }

    /**
     * 判断当前文件是否来自外部文件夹。
     */
    get external() { return inDir(process.cwd(), this.srcPath); }

    /**
     * 获取当前文件的信息。
     */
    get stats() { return getStatSync(this.srcPath); }

    /**
     * 测试当前文件名是否匹配指定的匹配器。
     * @param matcher 要测试通配符、正则表达式、函数或以上的匹配器组成的数组。
     * @returns 如果匹配则返回 true，否则返回 false。
     */
    match(matcher: Pattern) { return new Matcher(matcher).test(this.name); }

    /**
     * 解析当前文件内的地址所表示的实际地址。
     * @param url 要解析的地址。如 `../a.js?a=1`。
     * @returns 返回解析好的绝对地址。
     */
    resolve(url: string) { return resolveUrl(this.srcName, url); }

    /**
     * 获取在当前文件内引用指定地址或文件所使用的相对地址。
     * @param url 要解析的地址或文件。
     */
    relative(url: string | File) {
        return relativeUrl(this.name, url instanceof File ? url.name : url);
    }

    /**
     * 创建当前文件的副本。
     * @return 返回新文件对象。
     */
    clone() {
        return new File(this.srcName, this.destName, this.data);
    }

    // #endregion

}

/**
 * 表示文件触发的日志数据。
 */
export interface FileLogData extends LogData {

    /**
     * 获取源文件。
     */
    file?: File;

    /**
     * 是否允许执行源映射以重新定位源。
     */
    evalSourceMap?: boolean;

}

/**
 * 表示源码中的行列信息。
 */
interface Location {

    /**
     * 获取当前的行号(从 0 开始)。
     */
    line: number;

    /**
     * 获取当前的列号(从 0 开始)。
     */
    column: number;

}

/**
 * 表示工作模式。
 */
export const enum WorkingMode {

    /**
     * 生成。
     */
    build = 0,

    /**
     * 预览。
     */
    preview = 1 << 0,

    /**
     * 清理文件。
     */
    clean = 1 << 1,

    /**
     * 监听。
     */
    watch = 1 << 2,

}

/**
 * 获取当前工作模式。
 */
export var workingMode = WorkingMode.build;

/**
 * 获取已处理的文件数。
 */
export var fileCount = 0;

/**
 * 获取或设置记录一个文件日志时的回调函数。
 * @param file 当前相关的文件。
 * @param data 要记录的日志数据。
 * @param level 要记录的日志等级。
 * @returns 如果函数返回 false，则忽略此日志。
 */
export var onLogFile: (file: File, data: LogData, level: LogLevel) => (boolean | void);

/**
 * 获取或设置即将保存文件时的回调函数。
 * @param file 当前相关的文件。
 * @param savePath 要保存的绝对路径。
 * @returns 如果函数返回 false，则不保存此文件。
 */
export var onValidateFile: (file: File, savePath: string) => boolean;

/**
 * 获取或设置保存文件后的回调函数。
 * @param file 当前相关的文件。
 * @param savePath 已保存的绝对路径。
 */
export var onSaveFile: (file: File, savePath: string) => void;

/**
 * 获取或设置当删除文件后的回调函数。
 * @param file 当前相关的文件。
 */
export var onDeleteFile: (file: File) => void;

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
export var sourceMap = true;

/**
 * 获取或设置是否允许系统使用源映射信息。
 */
export var evalSourceMap = true;

/**
 * 获取或设置需要保存源映射的文件匹配器。
 */
export var saveSourceMap = new Matcher(/\.(js|css)$/i);

/**
 * 获取或设置用于计算每个文件的源映射路径的回调函数。
 * @param file 当前相关的文件。
 * @return 返回源映射的绝对路径。
 */
export var sourceMapPath: (file: File) => string;

/**
 * 获取或设置用于计算每个文件的源映射地址的回调函数。
 * @param file 当前相关的文件。
 * @return 返回源映射地址。
 */
export var sourceMapUrl: (file: File) => string;

/**
 * 获取或设置用于计算源映射中指定源文件地址的回调函数。
 * @param source 要计算的源文件地址。
 * @param file 当前相关的文件。
 * @return 返回对应的源文件地址。
 */
export var sourceMapSource: (source: string, file: File) => string;

/**
 * 获取或设置用于计算源映射中指定源文件内容的回调函数。
 * @param source 要计算的源文件地址。
 * @param file 当前相关的文件。
 * @return 返回对应的源文件内容。
 */
export var sourceMapSourceContent: (source: string, file: File) => string;

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
export var validateSourceMap: (sourceMap: SourceMapObject, file: File) => void;
