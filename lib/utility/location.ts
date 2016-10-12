/**
 * @fileOverview 位置
 * @author xuld<xuld@vip.qq.com>
 */

/**
 * 表示一个行列信息。
 */
export interface Location {

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
 * 计算指定索引对应的行列号。
 * @param value 要处理的字符串。
 * @param index 要计算的索引。
 * @param cache 如果提供一个缓存对象则存放一个索引数据以加速检索。
 * @returns 返回对应的行列号。如果索引错误则返回 0,0 位置。
 */
export function indexToLocation(value: string, index: number, cache?: { indexes?: number[] }): Location {
    if (index > 0) {
        const indexes = buildIndex(value, cache);

        // 确保游标所在位置在大于索引的最小位置。
        let cursor = indexes.index;
        while (indexes[cursor] <= index) cursor++;
        while (cursor >= indexes.length || indexes[cursor] > index) cursor--;
        indexes.index = cursor;

        return { line: cursor, column: index - indexes[cursor] };
    }
    return { line: 0, column: 0 };
}

/**
 * 计算指定行列号对应的索引。
 * @param value 要处理的字符串。
 * @param loc 要计算的行列号。
 * @param cache 如果提供一个缓存对象则存放一个索引数据以加速检索。
 * @returns 返回对应的索引。如果行列号错误则返回 0。
 */
export function locationToIndex(value: string, loc: Location, cache?: { indexes?: number[] }) {
    if (loc.line < 0) {
        return 0;
    }
    const indexes = buildIndex(value, cache);
    if (loc.line < indexes.length) {
        return Math.min(Math.max(0, indexes[loc.line] + loc.column), value.length);
    }
    return value.length;
}

/**
 * 表示一个索引数据。存储当前文件的每行第一个字符的索引值。
 */
type IndexData = number[] & {

    /**
     * 获取或设置检索的游标。
     */
    index?: number
};

/**
 * 生成行列索引对象。
 * @param value 要处理的字符串。
 * @returns 返回包含每行第一个字符索引的数组。
 */
function buildIndex(value: string, cache?: { indexes?: IndexData }) {
    if (cache && cache.indexes) {
        return cache.indexes;
    }
    const result: IndexData = [0];
    for (let i = 0; i < value.length; i++) {
        let ch = value.charCodeAt(i);
        if (ch === 13/*\r*/) {
            if (value.charCodeAt(i + 1) === 10/*\n*/) {
                i++;
            }
            ch = 10;
        }
        if (ch === 10/*\n*/) {
            result.push(i + 1);
        }
    }
    result.index = 0;
    if (cache) {
        cache.indexes = result;
    }
    return result;
}
