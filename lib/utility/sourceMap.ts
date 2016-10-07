/**
 * @fileOverview 源映射
 * @author xuld <xuld@vip.qq.com>
 */
import { resolveUrl, relativeUrl, normalizeUrl } from "./url";

/**
 * 表示一个源映射字符串。
 */
export type SourceMapString = string;

/**
 * 表示一个源映射对象。
 * @see https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k
 * @see http://www.alloyteam.com/2014/01/source-map-version-3-introduction/
 */
export interface SourceMapObject {

    /**
     * 获取当前源映射的版本号。
     */
    version: number;

    /**
     * 获取生成文件的路径。
     */
    file?: string;

    /**
     * 获取所有源文件的根路径。
     */
    sourceRoot?: string;

    /**
     * 获取所有源文件路径。
     */
    sources: string[];

    /**
     * 获取所有源文件内容。
     */
    sourcesContent?: string[];

    /**
     * 获取所有名称。
     */
    names?: string[];

    /**
     * 获取所有映射点。
     */
    mappings: string;

}

/**
 * 表示一个索引映射对象。
 */
export interface IndexMapObject {

    /**
     * 获取当前索引映射的版本号。
     */
    version: number;

    /**
     * 获取生成文件路径。
     */
    file?: string;

    /**
     * 获取所有区域。
     */
    sections: {

        /**
         * 获取当前区域的偏移。
         */
        offset: {

            /**
             * 获取当前偏移的行号(从 0 开始)。
             */
            line: number;

            /**
             * 获取当前偏移的列号(从 0 开始)。
             */
            column: number;

        };

        /**
         * 获取当前区域的源映射地址。
         */
        url?: string;

        /**
         * 获取当前区域的源映射数据。
         */
        map?: SourceMapObject | IndexMapObject;

    }[];

}

/**
 * 表示一个源映射生成器。
 */
export interface SourceMapGenerator {

    /**
     * 生成源映射对象。
     */
    toJSON(): SourceMapObject | IndexMapObject;

    /**
     * 生成源映射字符串。
     */
    toString(): SourceMapString;

}

/**
 * 表示一个源映射字符串、对象或构建器。
 */
export type SourceMapData = SourceMapString | SourceMapObject | IndexMapObject | SourceMapGenerator;

/**
 * 将指定的源映射数据转为源映射字符串。
 * @param sourceMapData 要转换的源映射数据。
 * @return 返回源映射字符串。
 */
export function toSourceMapString(sourceMapData: SourceMapData) {
    if (typeof sourceMapData === "string") {
        return sourceMapData;
    }
    return JSON.stringify(sourceMapData);
}

/**
 * 将指定的源映射数据转为源映射对象。
 * @param sourceMapData 要转换的源映射数据。
 * @return 返回源映射对象。
 */
export function toSourceMapObject(sourceMapData: SourceMapData) {
    // 为防止 XSS，源数据可能包含 )]}' 前缀。
    // https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#
    const sourceMapObject: SourceMapObject | IndexMapObject = typeof sourceMapData === "string" ?
        JSON.parse(sourceMapData.replace(/^\)]}'/, "")) :
        (<SourceMapGenerator>sourceMapData).toJSON ?
            (<SourceMapGenerator>sourceMapData).toJSON() :
            sourceMapData;
    if ((<IndexMapObject>sourceMapObject).sections) {
        throw new Error("Indexed Map is not implemented yet.");
    }
    if (sourceMapObject.version && sourceMapObject.version != 3) {
        throw new Error("Source Map v" + sourceMapObject.version + " is not implemented yet.");
    }
    return <SourceMapObject>sourceMapObject;
}

/**
 * 将指定的源映射数据转为源映射构建器。
 * @param sourceMapData 要转换的源映射数据。
 * @return 返回源映射构建器。
 */
export function toSourceMapBuilder(sourceMapData: SourceMapData) {
    if (sourceMapData instanceof SourceMapBuilder) {
        return sourceMapData;
    }
    return new SourceMapBuilder(sourceMapData);
}

/**
 * 表示一个源映射构建器。
 * @remark 提供解析、读取、生成、合并源映射的功能。
 */
export class SourceMapBuilder implements SourceMapGenerator {

    // #region 属性

    /**
     * 获取当前源映射构建器支持的版本号。
     */
    get version() { return 3; }

    /**
     * 获取或设置生成文件的路径。
     */
    file: string;

    /**
     * 获取或设置所有源文件的根路径。
     */
    sourceRoot: string;

    /**
     * 获取所有源文件路径。
     */
    sources: string[] = [];

    /**
     * 获取所有源文件内容。
     */
    sourcesContent: string[] = [];

    /**
     * 获取所有名称列表。
     */
    names: string[] = [];

    /**
     * 获取所有映射点。
     */
    mappings: Mapping[][] = [];

    /**
     * 添加一个源。
     * @param sourcePath 要添加的源地址。
     * @param sourceContent 要添加的源内容。
     * @return 返回源的索引。
     */
    addSource(sourcePath: string, sourceContent?: string) {
        sourcePath = this.sourceRoot ? resolveUrl(this.sourceRoot + "/", sourcePath) : normalizeUrl(sourcePath);
        let sourceIndex = this.sources.indexOf(sourcePath);
        if (sourceIndex < 0) this.sources[sourceIndex = this.sources.length] = sourcePath;
        if (sourceContent != undefined) this.sourcesContent[sourceIndex] = sourceContent;
        return sourceIndex;
    }

    /**
     * 添加一个名称。
     * @param name 要添加的名称。
     * @return 返回名字的索引。
     */
    addName(name: string) {
        let nameIndex = this.names.indexOf(name);
        if (nameIndex < 0) this.names[nameIndex = this.names.length] = name;
        return nameIndex;
    }

    /**
     * 获取指定源码的内容。
     * @param source 源码路径。
     * @return 返回源码内容。如果未包含指定的源内容，则返回 undefined。
     */
    getSourceContent(sourcePath: string) {
        return this.sourcesContent[this.sources.indexOf(sourcePath)];
    }

    /**
     * 设置指定源码的内容。
     * @param sourcePath 源码路径。
     * @param content 源码内容。
     */
    setSourceContent(sourcePath: string, sourceContent: string) {
        const index = this.sources.indexOf(sourcePath);
        if (index >= 0) {
            this.sourcesContent[index] = sourceContent;
        }
    }

    // #endregion

    // #region 解析和格式化

    /**
     * 初始化新的源映射构建器。
     * @param sourceMapData 要转换的源映射数据。
     */
    constructor(sourceMapData?: SourceMapData) {
        if (sourceMapData) {
            this.parse(toSourceMapObject(sourceMapData));
        }
    }

    /**
     * 解析指定的源映射数据并合并到当前构建器。
     * @param sourceMapObject 要解析的源映射对象。
     */
    parse(sourceMapObject: SourceMapObject) {
        if (sourceMapObject.file) {
            this.file = normalizeUrl(sourceMapObject.file);
        }
        if (sourceMapObject.sourceRoot) {
            this.sourceRoot = sourceMapObject.sourceRoot.replace(/\/$/, "");
        }
        if (sourceMapObject.sources) {
            for (let i = 0; i < sourceMapObject.sources.length; i++) {
                this.sources[i] = sourceMapObject.sourceRoot ? resolveUrl(sourceMapObject.sourceRoot + "/", sourceMapObject.sources[i]) : normalizeUrl(sourceMapObject.sources[i]);
            }
        }
        if (sourceMapObject.sourcesContent) {
            this.sourcesContent.push(...sourceMapObject.sourcesContent);
        }
        if (sourceMapObject.names) {
            this.names.push(...sourceMapObject.names);
        }
        if (sourceMapObject.mappings) {
            const context = { start: 0 };
            let line = 0;
            let mappings: Mapping[] = this.mappings[0] = [];
            let prevColumn = 0;
            let prevSourceIndex = 0;
            let prevSourceLine = 0;
            let prevSourceColumn = 0;
            let prevNameIndex = 0;
            while (context.start < sourceMapObject.mappings.length) {
                let ch = sourceMapObject.mappings.charCodeAt(context.start);
                if (ch !== 59/*;*/ && ch !== 44/*,*/) {
                    const mapping: Mapping = {
                        column: prevColumn += decodeBase64Vlq(sourceMapObject.mappings, context)
                    };
                    mappings.push(mapping);
                    if (context.start === sourceMapObject.mappings.length) break;
                    ch = sourceMapObject.mappings.charCodeAt(context.start);
                    if (ch !== 59/*;*/ && ch !== 44/*,*/) {
                        mapping.sourceIndex = prevSourceIndex += decodeBase64Vlq(sourceMapObject.mappings, context);
                        mapping.sourceLine = prevSourceLine += decodeBase64Vlq(sourceMapObject.mappings, context);
                        mapping.sourceColumn = prevSourceColumn += decodeBase64Vlq(sourceMapObject.mappings, context);
                        if (context.start === sourceMapObject.mappings.length) break;
                        ch = sourceMapObject.mappings.charCodeAt(context.start);
                        if (ch !== 59/*;*/ && ch !== 44/*,*/) {
                            mapping.nameIndex = prevNameIndex += decodeBase64Vlq(sourceMapObject.mappings, context);
                            if (context.start === sourceMapObject.mappings.length) break;
                            ch = sourceMapObject.mappings.charCodeAt(context.start);
                        }
                    }
                }
                context.start++;
                if (ch === 59/*;*/) {
                    this.mappings[++line] = mappings = [];
                    prevColumn = 0;
                }
            }
        }
    }

    /**
     * 将当前源映射转为等效的 JSON 对象。
     * @return 返回源映射对象。
     */
    toJSON() {
        const result: SourceMapObject = {
            version: this.version,
            sources: [],
            mappings: ""
        };
        if (this.file) {
            result.file = this.file;
        }
        if (this.sourceRoot) {
            result.sourceRoot = this.sourceRoot;
        }
        for (let i = 0; i < this.sources.length; i++) {
            result.sources[i] = this.sourceRoot ? relativeUrl(this.sourceRoot + "/", this.sources[i]) : this.sources[i];
        }
        if (this.sourcesContent && this.sourcesContent.length) {
            result.sourcesContent = this.sourcesContent;
        }
        if (this.names && this.names.length) {
            result.names = this.names;
        }
        if (this.mappings && this.mappings.length) {
            let prevSourceIndex = 0;
            let prevSourceLine = 0;
            let prevSourceColumn = 0;
            let prevNameIndex = 0;
            for (let i = 0; i < this.mappings.length; i++) {
                if (i > 0) result.mappings += ";";
                const mappings = this.mappings[i];
                if (mappings) {
                    let prevColumn = 0;
                    for (let j = 0; j < mappings.length; j++) {
                        if (j > 0) result.mappings += ",";
                        const mapping = mappings[j];
                        result.mappings += encodeBase64Vlq(mapping.column - prevColumn);
                        prevColumn = mapping.column;
                        if (mapping.sourceIndex != undefined && mapping.sourceLine != undefined && mapping.sourceColumn != undefined) {
                            result.mappings += encodeBase64Vlq(mapping.sourceIndex - prevSourceIndex);
                            prevSourceIndex = mapping.sourceIndex;
                            result.mappings += encodeBase64Vlq(mapping.sourceLine - prevSourceLine);
                            prevSourceLine = mapping.sourceLine;
                            result.mappings += encodeBase64Vlq(mapping.sourceColumn - prevSourceColumn);
                            prevSourceColumn = mapping.sourceColumn;
                            if (mapping.nameIndex != undefined) {
                                result.mappings += encodeBase64Vlq(mapping.nameIndex - prevNameIndex);
                                prevNameIndex = mapping.nameIndex;
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    /**
     * 将当前源映射转为等效的字符串。 
     * @return 返回源映射字符串。
     */
    toString() { return JSON.stringify(this); }

    // #endregion

    // #region 处理

    /**
     * 计算指定位置的源位置。
     * @param line 要获取的行号(从 0 开始)。
     * @param column 要获取的列号(从 0 开始)。
     * @return 返回源信息对象。
     */
    getSource(line: number, column: number): SourceLocation {

        // 搜索当前行指定列的映射。
        const mappings = this.mappings[line];
        if (mappings) {
            for (let i = mappings.length; --i >= 0;) {
                const mapping = mappings[i];
                if (column >= mapping.column) {
                    const result: SourceLocation = {
                        mapping,
                        sourcePath: this.sources[mapping.sourceIndex],
                        sourceContent: this.sourcesContent[mapping.sourceIndex],
                        line: mapping.sourceLine,
                        column: mapping.sourceColumn + column - mapping.column
                    };
                    if (column === mapping.column && mapping.nameIndex != undefined) {
                        result.name = this.names[mapping.nameIndex];
                    }
                    return result;
                }
            }
        }

        // 当前行不存在对应的映射，搜索上一行的映射信息。
        for (let i = line; --i >= 0;) {
            if (this.mappings[i] && this.mappings[i].length) {
                const mapping = this.mappings[i][this.mappings[i].length - 1];
                return {
                    mapping,
                    sourcePath: this.sources[mapping.sourceIndex],
                    sourceContent: this.sourcesContent[mapping.sourceIndex],
                    line: mapping.sourceLine + line - i,
                    column: column
                };
            }
        }

        // 找不到映射点，直接返回源位置。
        return {

            /**
             * 源文件路径。
             */
            sourcePath: this.file,

            /**
             * 源行号。行号从 0 开始。
             */
            line,

            /**
             * 源列号。列号从 0 开始。
             */
            column,

        };
    }

    /**
     * 添加一个映射点。
     * @param line 生成的行。
     * @param column 生成的列。
     * @param sourcePath 映射的源地址。
     * @param sourceLine 映射的行号。行号从 0 开始。
     * @param sourceColumn 映射的列号。列号从 0 开始。
     * @param name 映射的名称。
     * @return 返回添加的映射点。
     */
    addMapping(line: number, column: number, sourcePath?: string, sourceLine?: number, sourceColumn?: number, name?: string) {

        // 创建映射点。
        const mapping: Mapping = {
            column: column
        };
        if (sourcePath != undefined && sourceLine != undefined && sourceColumn != undefined) {
            mapping.sourceIndex = this.addSource(sourcePath);
            mapping.sourceLine = sourceLine;
            mapping.sourceColumn = sourceColumn;
            if (name != undefined) {
                mapping.nameIndex = this.addName(name);
            }
        }

        // 插入排序。
        const mappings = this.mappings[line];
        if (!mappings) {
            this.mappings[line] = [mapping];
        } else if (!mappings.length || column >= mappings[mappings.length - 1].column) {
            mappings.push(mapping);
        } else {
            for (let i = mappings.length; --i >= 0;) {
                if (column >= mappings[i].column) {
                    if (column === mappings[i].column) {
                        mappings[i] = mapping;
                    } else {
                        mappings.splice(i + 1, 0, mapping);
                    }
                    return mapping;
                }
            }
            mappings.unshift(mapping);
        }
        return mapping;
    }

    /**
     * 遍历所有映射点。
     * @param callback 要遍历的回调函数。
     * @param scope 设置 *callback* 中 this 的值。
     */
    eachMapping(callback: (line: number, column: number, sourcePath: string, sourceContent: string, sourceLine: number, sourceColumn: number, name: string, mapping: Mapping) => void, scope?: any) {
        for (let i = 0; i < this.mappings.length; i++) {
            const mappings = this.mappings[i];
            if (mappings) {
                for (let j = 0; j < mappings.length; j++) {
                    const mapping = mappings[j];
                    callback.call(scope, i, mapping.column, this.sources[mapping.sourceIndex], this.sourcesContent[mapping.sourceIndex], mapping.sourceLine, mapping.sourceColumn, this.names[mapping.nameIndex], mapping);
                }
            }
        }
    }

    /**
     * 基于指定的源映射更新当前源映射的源码位置。
     * @param other 要应用的源映射。
     * @param file *other* 对应的源文件。如果未提供将使用 *other.file*。
     * @remark
     * 假如有源文件 A，通过一次生成得到 B，其映射表记作 T。
     * 现在基于 B，通过第二次生成得到 C，其映射表记作 M。
     * 那么就需要通过调用 `M.applySourceMap(T)`,
     * 将 M 更新为 A 到 C 的映射表。
     */
    applySourceMap(other: SourceMapBuilder, file?: string) {

        // 合并映射表的算法为：
        // 对于 M 中的每一条映射 p，如果 p.source 同 T.file，
        // 则将其源行列号更新为 T 中指定的源码和源行列号。

        // 只有源索引为 expectedSourceIndex 的映射才能基于 T 更新。
        const expectedSourceIndex = file != undefined ? this.sources.indexOf(file) : other.file != undefined ? this.sources.indexOf(other.file) : 0;
        if (expectedSourceIndex < 0) return;

        for (const mappings of this.mappings) {
            if (mappings) {
                for (let i = 0; i < mappings.length; i++) {
                    const mapping = mappings[i];
                    if (mapping.sourceIndex === expectedSourceIndex) {

                        // 下一个映射点。
                        const nextColumn = i + 1 < mappings.length && mappings[i + 1].column || Infinity;

                        // 在 M 中 mapping.column 到 nextColumn 之间不存在其它映射。
                        // 但是在 T 中对应的区间则可能包含多个映射，这些映射要重新拷贝到 M。
                        if (other.mappings[mapping.sourceLine]) {
                            for (const targetMapping of other.mappings[mapping.sourceLine]) {
                                if (targetMapping.column > mapping.sourceColumn) {
                                    // 根据 T 中的列号反推 M 的索引：
                                    // mapping.column -> mapping.sourceColumn
                                    // ? -> targetMapping.column
                                    const column = mapping.column + targetMapping.column - mapping.sourceColumn;

                                    // M 中已经指定了 column 的映射，忽略 T 的剩余映射。
                                    if (column >= nextColumn) {
                                        break;
                                    }

                                    // 拷贝 T 多余的映射点到 M。
                                    const m: Mapping = {
                                        column,
                                        sourceIndex: this.addSource(other.sources[targetMapping.sourceIndex]),
                                        sourceLine: targetMapping.sourceLine,
                                        sourceColumn: targetMapping.sourceColumn
                                    };
                                    if (targetMapping.nameIndex != undefined) {
                                        m.nameIndex = this.addName(other.names[targetMapping.nameIndex]);
                                    }
                                    mappings.splice(++i, 0, m);

                                }
                            }
                        }

                        // 更新当前映射信息。
                        const source = other.getSource(mapping.sourceLine, mapping.sourceColumn);
                        mapping.sourceIndex = this.addSource(source.sourcePath);
                        mapping.sourceLine = source.line;
                        mapping.sourceColumn = source.column;
                        if (source.name != undefined) {
                            mapping.nameIndex = this.addName(source.name);
                        }

                    }
                }
            }
        }

    }

    /**
     * 自动补齐指定行的映射点。
     * @param start 开始补齐的行号。
     * @param end 结束补齐的行号。
     * @remark 
     * 由于源映射 v3 不支持根据上一行的映射推断下一行的映射。
     * 因此在生成源映射 v3 时，必须插入每一行的映射点。
     * 此函数可以根据首行信息自动推断下一行的信息。
     */
    computeLines(start = 0, end = this.mappings.length) {
        for (; start < end; start++) {
            const mappings = this.mappings[start] || (this.mappings[start] = []);
            if (!mappings[0] || mappings[0].column > 0) {
                for (let line = start; --line >= 0;) {
                    const last = this.mappings[line] && this.mappings[line][0];
                    if (last && last.sourceIndex != undefined && last.sourceLine != undefined && last.sourceColumn != undefined) {
                        mappings.unshift({
                            column: 0,
                            sourceIndex: last.sourceIndex,
                            sourceLine: last.sourceLine + start - line,
                            sourceColumn: 0
                        });
                        break;
                    }
                }
            }
        }
    }

    // #endregion

}

/**
 * 表示源映射中的一个映射点。
 */
export interface Mapping {

    /**
     * 获取当前映射的列。
     */
    column: number;

    /**
     * 获取或设置当前位置的源文件索引。索引从 0 开始。
     */
    sourceIndex?: number;

    /**
     * 获取或设置当前位置的源文件行号。行号从 0 开始。
     */
    sourceLine?: number;

    /**
     * 获取或设置当前位置的源文件列号。列号从 0 开始。
     */
    sourceColumn?: number;

    /**
     * 获取或设置当前位置的名称索引。索引从 0 开始。
     */
    nameIndex?: number;

}

/**
 * 表示一个源位置。
 */
export interface SourceLocation {

    /**
     * 原始映射点。
     */
    mapping?: Mapping;

    /**
     * 源文件路径。
     */
    sourcePath: string;

    /**
     * 源文件内容。
     */
    sourceContent?: string;

    /**
     * 源行号(从 0 开始)。
     */
    line: number;

    /**
     * 源列号(从 0 开始)。
     */
    column: number;

    /**
     * 源名称。
     */
    name?: string;

}

const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");

/**
 * 编码一个 Base64-VLQ 值。
 * @param value 要计算的值。
 * @return 返回已编码的字符串。
 */
function encodeBase64Vlq(value: number) {
    let result = "";
    let vlq = value < 0 ? ((-value) << 1) + 1 : (value << 1);
    do {
        const digit = vlq & 31/*(1<<5)-1*/;
        vlq >>>= 5;
        result += base64Chars[vlq > 0 ? digit | 32/*1<<5*/ : digit];
    } while (vlq > 0);
    return result;
}

/**
 * 编码一个 Base64-VLQ 值。
 * @param value 要计算的值。
 * @param context 开始解码的位置。解码结束后更新为下一次需要解码的位置。
 * @return 返回已解码的数字。如果解析错误则返回 NaN。
 */
function decodeBase64Vlq(value: string, context: { start: number }) {
    let vlq = 0;
    let shift = 0;
    do {
        const ch = value.charCodeAt(context.start++);
        var digit = 65/*A*/ <= ch && ch <= 90/*Z*/ ? ch - 65/*A*/ : // 0 - 25: ABCDEFGHIJKLMNOPQRSTUVWXYZ
            97/*a*/ <= ch && ch <= 122/*z*/ ? ch - 71/*'a' - 26*/ : // 26 - 51: abcdefghijklmnopqrstuvwxyz
                48/*0*/ <= ch && ch <= 57/*9*/ ? ch + 4/*'0' - 26*/ : // 52 - 61: 0123456789
                    ch === 43/*+*/ ? 62 : // 62: +
                        ch === 47/*/*/ ? 63 : // 63: /
                            NaN;
        vlq += ((digit & 31/*(1<<5)-1*/) << shift);
        shift += 5;
    } while (digit & 32/*1<<5*/);
    return vlq & 1 ? -(vlq >> 1) : vlq >> 1;
}

/**
 * 向指定内容插入 #sourceMappingURL 注释。
 * @param content 要插入的内容。
 * @param sourceMapUrl 要插入的源映射地址。如果地址为空则删除已存在的注释。
 * @param singleLineComment 如果为 true 则使用单行注释否则使用多行注释。
 */
export function emitSourceMapUrl(content: string, sourceMapUrl: string, singleLineComment?: boolean) {
    let found = false;
    content = content.replace(/(?:\/\*(?:\s*\r?\n(?:\/\/)?)?(?:[#@]\ssourceMappingURL=([^\s'"]*))\s*\*\/|\/\/(?:[#@]\ssourceMappingURL=([^\s'"]*)))\s*/, (_, url1: string, url2: string) => {
        found = true;
        return sourceMapUrl ? url2 != null ? `//# sourceMappingURL=${sourceMapUrl}` : `/*# sourceMappingURL=${sourceMapUrl} */` : "";
    });
    if (!found && sourceMapUrl) {
        content += singleLineComment ? `\n//# sourceMappingURL=${sourceMapUrl}` : `\n/*# sourceMappingURL=${sourceMapUrl} */`;
    }
    return content;
}
