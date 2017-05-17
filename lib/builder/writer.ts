import { indexToLocation } from "../utility/location";
import { Writable, WritableOptions } from "stream";
import { SourceMapBuilder, SourceMapData, SourceMapObject, toSourceMapBuilder, Mapping } from "../utility/sourceMap";
import { File } from "./file";

/**
 * 表示一个写入器。
 */
export class Writer {

    /**
     * 初始化新的写入器。
     * @param file 写入的目标文件。
     * @param options 写入器的选项。
     */
    constructor(public readonly file: File, public readonly options: WriterOptions = {}) {
        if (options.indentChar == undefined) {
            options.indentChar = "\t";
        }
    }

    /**
     * 当前使用的缩进字符串。
     */
    indentString = "";

    /**
     * 增加一个缩进。
     */
    indent() { this.indentString += this.options.indentChar; }

    /**
     * 减少一个缩进。
     */
    unindent() { this.indentString = this.indentString.substr(0, this.indentString.length - this.options.indentChar!.length); }

    /**
     * 已写入的文本内容。
     */
    protected content = "";

    /**
     * 返回当前写入的文本内容。
     * @return 返回文本内容。
     */
    toString() { return this.content; }

    /**
     * 写入一段文本。
     * @param content 要写入的内容。
     * @param startIndex 要写入的内容的开始索引(从 0 开始)。
     * @param endIndex 要写入的内容的结束索引(从 0 开始)。
     * @param sourcePath 内容的源文件路径。
     * @param sourceMap 源文件中的源映射。如果存在将自动合并到当前源映射。
     * @param sourceMap 源文件中的源映射。如果存在将自动合并到当前源映射。
     * @param sourceLine 内容在源文件中的行号(从 0 开始)。
     * @param sourceColumn 内容在源文件中的列号(从 0 开始)。
     */
    write(content: string, startIndex?: number, endIndex?: number, sourcePath?: string, sourceMap?: SourceMapBuilder, sourceLine?: number, sourceColumn?: number) {
        if (!this.indentString) {
            if (startIndex! > 0 || endIndex! < content.length) {
                content = content.substring(startIndex! || 0, endIndex);
            }
            this.content += content;
        } else {
            startIndex = startIndex || 0;
            if (endIndex == undefined) endIndex = content.length;
            let prevNewLine = !this.content.length || /[\r\n]$/.test(this.content);

            for (let i = startIndex; i < endIndex; i++) {
                const ch = content.charCodeAt(i);
                const newLine = ch === 13 /*\r*/ || ch === 10 /*\n*/;

                // 新行需要添加缩进。
                if (prevNewLine && !newLine) {
                    this.content += this.indentString;
                }

                // 添加内容。
                this.content += content.charAt(i);

                // 添加新行。
                if (newLine && ch === 13 /*\r*/ && content.charCodeAt(i + 1) === 10 /*\n*/) {
                    i++;
                    this.content += "\n";
                }

                prevNewLine = newLine;
            }

        }
    }

    /**
     * 写入一个文件的内容。
     * @param content 要写入的文件。
     * @param startIndex 要写入的内容的开始索引(从 0 开始)。
     * @param endIndex 要写入的内容的结束索引(从 0 开始)。
     */
    writeFile(file: File, startIndex?: number, endIndex?: number) {
        this.write(file.content, startIndex, endIndex);
    }

    /**
     * 将当前写入器的内容保存到文件。
     */
    end() { this.file.content = this.content; }

}

/**
 * 表示一个支持源映射的写入器。
 */
export class SourceMapWriter extends Writer {

    /**
     * 当前使用的源映射生成器。
     */
    private readonly sourceMapBuilder = new SourceMapBuilder();

    /**
     * 获取当前生成的源映射。
     */
    get sourceMap() {
        const result = this.sourceMapBuilder.toJSON();
        result.file = this.file.srcPath;
        return result;
    }

    /**
     * 当前写入的行号。
     */
    private line = 0;

    /**
     * 当前写入的列号。
     */
    private column = 0;

    write(content: string, startIndex = 0, endIndex = content.length, sourcePath?: string, sourceMap?: SourceMapBuilder, sourceLine?: number, sourceColumn?: number) {

        if (sourceLine == undefined) {
            const loc = indexToLocation(content, startIndex);
            sourceLine = loc.line;
            sourceColumn = loc.column;
        }

        let prevNewLine = !this.content.length || /[\r\n]$/.test(this.content);
        let prevCharType: number | undefined;
        let mappings = sourceMap && sourceMap.mappings[sourceLine!];
        let mappingsIndex = 0;
        if (mappings) {
            while (mappingsIndex < mappings.length && mappings[mappingsIndex].generatedColumn < sourceColumn!) {
                mappingsIndex++;
            }
        }

        for (let i = startIndex; i <= endIndex; i++) {
            const ch = content.charCodeAt(i);
            const newLine = ch === 13 /*\r*/ || ch === 10 /*\n*/;
            const charType = sourcePath == undefined ? prevCharType :
                newLine || sourceMap || this.options.sourceMapLineMappingsOnly ? 0 :
                    ch === 32 /* */ || ch === 9 /*\t*/ ? 32 :
                        ch >= 97 /*a*/ && ch <= 122 /*z*/ || ch >= 65 /*A*/ && ch <= 90 /*Z*/ || ch >= 48 /*0*/ && ch <= 57 /*9*/ || ch === 95 /*_*/ ? 65 :
                            ch === 44 /*,*/ || ch === 59 /*;*/ || ch === 40 /*(*/ || ch === 41 /*)*/ || ch === 123 /*{*/ || ch === 125 /*}*/ || ch === 91 /*[*/ || ch === 93 /*]*/ ? ch : 1;

            if (sourceMap) {
                // 如果提供了源映射，拷贝映射点。
                if (mappings && mappingsIndex < mappings.length) {
                    const mapping = mappings[mappingsIndex];
                    if (mapping.generatedColumn === sourceColumn) {
                        mappingsIndex++;
                        this.sourceMapBuilder.addMapping(this.line, this.column, mapping.sourceIndex == undefined ? undefined : sourceMap.sources[mapping.sourceIndex], mapping.sourceLine, mapping.sourceColumn, mapping.nameIndex == undefined ? undefined : sourceMap.names[mapping.nameIndex]);
                    }
                }
            } else if (charType !== prevCharType) {
                // 如果未提供源映射，在字符类型变化后自动生成映射点。
                this.sourceMapBuilder.addMapping(this.line, this.column, sourcePath, sourceLine, sourceColumn);
            }

            if (i < endIndex) {

                // 新行需要添加缩进。
                if (prevNewLine && !newLine) {
                    this.content += this.indentString;
                    this.column += this.indentString.length;
                }

                // 添加内容。
                this.content += content.charAt(i);
                this.column++;
                if (sourceColumn != undefined) {
                    sourceColumn++;
                }

                // 添加新行。
                if (newLine) {
                    if (ch === 13 /*\r*/ && content.charCodeAt(i + 1) === 10 /*\n*/) {
                        i++;
                        this.content += "\n";
                    }
                    this.line++;
                    this.column = 0;
                    if (sourceLine != undefined) {
                        sourceLine++;
                        sourceColumn = mappingsIndex = 0;
                        mappings = sourceMap && sourceMap.mappings[sourceLine!];
                    }
                }

                prevNewLine = newLine;
                if (charType) {
                    prevCharType = charType;
                }
            }

        }

    }

    /**
     * 写入一个文件的内容。
     * @param content 要写入的文件。
     * @param startIndex 要写入的内容的开始索引。
     * @param endIndex 要写入的内容的结束索引。
     */
    writeFile(file: File, startIndex?: number, endIndex?: number) {
        const loc = file.indexToLocation(startIndex || 0);
        this.write(file.content, startIndex, endIndex, file.srcPath, file.sourceMapBuilder, loc.line, loc.column);
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
     * 是否只生成行信息。
     */
    sourceMapLineMappingsOnly?: boolean;

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
    constructor(file: File, options?: StreamOptions) {
        super(options);
        this.file = file;
        this.buffer = Buffer.allocUnsafe(options && options.capacity || 64 * 1024);
    }

    /**
     * 确保当前流可以存放指定长度的缓存。
     * @param length 要设置的新长度。
     */
    ensureCapacity(length: number) {
        if (length < this.buffer.length) {
            return;
        }
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
     * @override
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
     * @return 返回复制的缓存对象。
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
     * @return 返回字符串。
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
     * 初始的缓存大小。
     */
    capacity?: number;

}
