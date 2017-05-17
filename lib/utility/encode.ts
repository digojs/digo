/**
 * 将指定的缓存对象转为字符串。
 * @param value 要处理的缓存对象。
 * @param encoding 转换的编码。
 * @return 返回处理后的字符串。BOM 字符会被自动删除。
 * @see https://en.wikipedia.org/wiki/Byte_order_mark
 */
export function bufferToString(value: Buffer, encoding = "utf-8") {
    // 删除 UTF-8 BOM。
    if (value[0] === 0xEF && value[1] === 0xBB && value[2] === 0xBF) {
        return value.toString(encoding, 3);
    }
    // 删除 UTF-16 BOM。
    if (value[0] === 0xFE && value[1] === 0xFF || value[0] === 0xFF && value[1] === 0xFE) {
        return value.toString(encoding, 2);
    }
    // FIXME: 需要支持其它编码?
    return value.toString(encoding);
}

/**
 * 将指定的字符串转为缓存对象。
 * @param value 要处理的字符串。
 * @param encoding 转换的编码。
 * @return 返回处理后的缓存对象。
 */
export function stringToBuffer(value: string, encoding = "utf-8") {
    // FIXME: 需要支持其它编码?
    return Buffer.from(value, encoding);
}

/**
 * 计算指定数据的 Base64 值。
 * @param data 要处理的字符串或缓存对象。
 * @return 返回结果字符串。
 * @example base64("A") // "QQ=="
 */
export function base64(data: string | Buffer) {
    return (data instanceof Buffer ? data : Buffer.from(data)).toString("base64");
}

/**
 * 计算指定数据的 Base64 编码地址。
 * @param mimeType 数据的 MIME 类型。
 * @param data 要处理的字符串或缓存对象。
 * @return 返回结果字符串。
 * @example base64Uri("text/javascript", "A") // "data:text/javascript;base64,QQ=="
 */
export function base64Uri(mimeType: string, data: string | Buffer) {
    return `data:${mimeType};base64,${base64(data)}`;
}
