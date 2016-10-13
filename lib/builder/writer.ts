/**
 * @fileOverview 写入器
 * @author xuld <xuld@vip.qq.com>
 */
import { Writable, WritableOptions } from "stream";
import { toSourceMapBuilder, SourceMapBuilder, SourceMapObject, SourceMapData } from "../utility/sourceMap";
import { File } from "./file";

/**
 * 表示一个写入器。
 */
export class Writer {

    // #region 基本属性

    /**
     * 获取当前写入的目标文件。
     */
    readonly file: File;

    /**
     * 初始化新的写入器。
     * @param file 写入的目标文件。
     * @param options 写入的选项。
     */
    constructor(file: File, options?: WriterOptions) {
        this.file = file;
        if (options && options.indentChar != null) this.indentChar = options.indentChar;
    }

    // #endregion

    // #region 缩进

    /**
     * 获取或设置当前使用的缩进字符串。
     */
    indentString = "";

    /**
     * 获取或设置当前使用的缩进字符。
     */
    indentChar = "\t";

    /**
     * 增加一个缩进。
     */
    indent() {
        this.indentString += this.indentChar;
        const ch = this.content.charCodeAt(this.content.length - 1);
        if (ch === 10/*\r*/ || ch === 13/*\r*/ || ch !== ch) {
            this.write(this.indentString);
        }
    }

    /**
     * 减少一个缩进。
     */
    unindent() {
        this.indentString = this.indentString.substr(0, this.indentString.length - this.indentChar.length);
    }

    // #endregion

    // #region 写入

    /**
     * 获取最终生成的文本内容。
     */
    protected content = "";

    /**
     * 底层实现写入一段文本。
     * @param content 要写入的内容。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     * @param sourcePath 内容的源文件路径。
     * @param sourceLine 内容在源文件中的行号(从 0 开始)。
     * @param sourceColumn 内容在源文件中的列号(从 0 开始)。
     * @param sourceMap 源文件中的源映射。如果存在将自动合并到当前源映射。
     */
    write(content: string, startIndex?: number, endIndex?: number, sourcePath?: string, sourceLine?: number, sourceColumn?: number, sourceMap?: SourceMapData) {
        if (startIndex > 0 || endIndex < content.length) {
            content = content.substring(startIndex, endIndex);
        }
        this.content += this.indentString ? content.replace(/\r\n?|\n/g, "$&" + this.indentString) : content;
    }

    /**
     * 写入一个文件的内容。
     * @param content 要写入的文件。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     */
    writeFile(file: File, startIndex?: number, endIndex?: number) {
        const loc = file.indexToLocation(startIndex);
        this.write(file.content, startIndex, endIndex, file.srcPath || file.destPath, loc.line, loc.column, file.sourceMapBuilder);
    }

    /**
     * 返回当前生成的代码。
     * @returns 返回完整的代码。
     */
    toString() { return this.content; }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() { this.file.content = this.content; }

    // #endregion

}

/**
 * 表示一个支持源映射的写入器。
 */
export class SourceMapWriter extends Writer {

    /**
     * 存储当前使用的源映射生成器。
     */
    private readonly sourceMapBuilder = new SourceMapBuilder;

    /**
     * 获取当前生成的源映射。
     */
    get sourceMap() { return this.sourceMapBuilder.toJSON(); }

    /**
     * 初始化新的写入器。
     * @param file 写入的目标文件。
     * @param options 写入的选项。
     */
    constructor(file: File, options?: WriterOptions) {
        super(file, options);
        this.sourceMapBuilder.file = file.srcPath;
    }

    /**
     * 存储当前写入的行号。
     */
    private currentLine = 0;

    /**
     * 存储当前写入的列号。
     */
    private currentColumn = 0;

    /**
     * 底层实现写入一段文本。
     * @param content 要写入的内容。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     * @param sourcePath 内容的源文件路径。
     * @param sourceLine 内容在源文件中的行号(从 0 开始)。
     * @param sourceColumn 内容在源文件中的列号(从 0 开始)。
     * @param sourceMap 源文件中的源映射。如果存在将自动合并到当前源映射。
     */
    write(content: string, startIndex?: number, endIndex?: number, sourcePath?: string, sourceLine?: number, sourceColumn?: number, sourceMap?: SourceMapData) {

        // 修复参数。
        startIndex = startIndex || 0;
        endIndex = endIndex || content.length;
        if (sourceMap) {
            sourceMap = toSourceMapBuilder(sourceMap);
        }

        // 计算最后一个换行符位置。
        // 如果值为 startIndex - 1 说明 content 只有一行。
        let lastLineBreak = endIndex;
        while (--lastLineBreak >= startIndex) {
            const ch = content.charCodeAt(lastLineBreak);
            if (ch === 13 /*\r*/ || ch === 10 /*\n*/) {
                break;
            }
        }

        // 依次写入每个字符。
        for (let i = startIndex; i < endIndex; i++) {
            this.content += content.charAt(i);

            // 换行：更新行列号以及添加映射。
            let ch = content.charCodeAt(i);
            if (ch === 13/*\r*/) {
                if (content.charCodeAt(i + 1) === 10 /*\n*/) {
                    i++;
                    this.content += "\n";
                }
                ch = 10;
            }
            if (ch === 10/*\n*/) {
                if (sourceLine !== undefined) {
                    sourceLine++;
                }
                sourceColumn = 0;
                this.currentLine++;
                if (this.indentString) {
                    this.content += this.indentString;
                    this.currentColumn = this.indentString.length;
                } else {
                    this.currentColumn = 0;
                }
            }

            // 首次/换行：添加映射点。
            if (ch === 10/*\n*/ || i === startIndex) {

                // 映射 _currentLine,_currentColumn -> sourceLine,sourceColumn。
                const mappings = this.sourceMapBuilder.mappings[this.currentLine] || (this.sourceMapBuilder.mappings[this.currentLine] = []);
                if (mappings.length && mappings[mappings.length - 1].column === this.currentColumn) {
                    mappings.pop();
                }
                mappings.push({
                    column: this.currentColumn,
                    sourceIndex: this.sourceMapBuilder.addSource(sourcePath),
                    sourceLine: sourceLine,
                    sourceColumn: sourceColumn
                });

                // 如果 content 本身存在映射，需要复制 content 在 sourceLine 的所有映射点。
                if (sourceMap && (<SourceMapBuilder>sourceMap).mappings[sourceLine]) {
                    for (const mapping of (<SourceMapBuilder>sourceMap).mappings[sourceLine]) {

                        // 第一行：忽略 sourceColumn 之前的映射。
                        if (i === startIndex && mapping.column < sourceColumn) {
                            continue;
                        }

                        // 最后一行：忽略 content 存放后最新长度之后的映射。
                        if (lastLineBreak < startIndex) {
                            if (mapping.column >= sourceColumn + endIndex - startIndex) {
                                break;
                            }
                        } else if (i === lastLineBreak) {
                            if (mapping.column >= endIndex - lastLineBreak) {
                                break;
                            }
                        }

                        // 复制源信息，但 mapping.column 更新为 newColumn。
                        const newColumn = mapping.column - sourceColumn + this.currentColumn;

                        // 之前已添加过当前行首的映射信息。
                        // 如果 srcSourceMap 已经包含了行首的映射信息，则覆盖之前的映射。
                        if (mappings.length && mappings[mappings.length - 1].column === newColumn) {
                            mappings.pop();
                        }

                        // 复制一个映射点。
                        mappings.push({
                            column: newColumn,
                            sourceIndex: this.sourceMapBuilder.addSource((<SourceMapBuilder>sourceMap).sources[mapping.sourceIndex]),
                            sourceLine: mapping.sourceLine,
                            sourceColumn: mapping.sourceColumn,
                            nameIndex: this.sourceMapBuilder.addName((<SourceMapBuilder>sourceMap).names[mapping.nameIndex])
                        });

                    }
                }

            }

        }

        // 更新结果列。
        if (lastLineBreak < startIndex) {
            this.currentColumn += endIndex - startIndex;
        } else {
            this.currentColumn = endIndex - lastLineBreak - 1 + (this.indentString ? this.indentString.length : 0);
        }

    }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() {
        super.end();
        this.file.sourceMapData = this.sourceMapBuilder;
    }

}

/**
 * 表示写入器的配置。
 */
export interface WriterOptions {

    /**
     * 是否支持生成源映射。
     */
    sourceMap?: boolean;

    /**
     * 缩进字符。
     */
    indentChar?: string;

}

/**
 * 表示一个缓存流。
 */
export class BufferStream extends Writable {

    /**
     * 获取当前写入的目标文件。
     */
    readonly file: File;

    /**
     * 存储最终的缓存。
     */
    private buffer: Buffer;

    /**
     * 获取当前流的长度。
     */
    length = 0;

    /**
     * 获取当前流的容器大小。
     */
    get capacity() { return this.buffer.length; }

    /**
     * 初始化新的缓存流。
     * @param file 写入的目标文件。
     * @param options 原始写入配置。
     */
    constructor(file: File, options: StreamOptions) {
        super(options);
        this.file = file;
        this.buffer = Buffer.allocUnsafe(options.capacity || 64 * 1024);
    }

    /**
     * 确保当前流可以存放指定长度的缓存。
     * @param length 要设置的新长度。
     */
    ensureCapacity(length) {
        if (length < this.buffer.length) return;

        length = Math.min(length, this.buffer.length * 2 - 1);
        const newBuffer = Buffer.allocUnsafe(length);
        this.buffer.copy(newBuffer, 0, 0, this.length);
        this.buffer = newBuffer;
    }

    /**
     * 底层实现写入操作。
     * @param chunk 要写入的缓存。
     * @param encoding 写入的编码。
     * @param callback 写入的回调。
     * @internal
     */
    _write(chunk: Buffer, encoding: string, callback: Function) {
        this.ensureCapacity(this.length + chunk.length);
        chunk.copy(this.buffer, this.length, 0);
        this.length += chunk.length;
        callback();
    }

    /**
     * 获取当前流的内容。
     * @param start 开始的位置。
     * @param end 结束的位置。
     * @returns 返回复制的缓存对象。
     */
    toBuffer(start = 0, end = this.length) {
        start = Math.max(start, 0);
        end = Math.min(end, this.length);
        const result = Buffer.allocUnsafe(end - start);
        this.buffer.copy(result, 0, start, end);
        return result;
    }

    /**
     * 获取当前流的字符串形式。
     * @param start 开始的位置。
     * @param end 结束的位置。
     * @returns 返回字符串。
     */
    toString(encoding?: string, start = 0, end = this.length) {
        return this.buffer.toString(encoding, Math.max(start, 0), Math.min(end, this.length));
    }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() { this.file.buffer = this.toBuffer(); }

}

/**
 * 表示流的配置。
 */
export interface StreamOptions extends WritableOptions {

    /**
     * 设置初始的缓存大小。
     */
    capacity?: number;

}
