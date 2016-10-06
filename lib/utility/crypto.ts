/**
 * @fileOverview 加密
 * @author xuld <xuld@vip.qq.com>
 */
import * as crypto from "crypto";

/**
 * 计算指定数据的 SHA-1 值。
 * @param data 要计算的字符串或缓存。
 * @return 返回结果字符串。其中只包含小写十六进制数值。
 * @example sha1("A") // "6dcd4ce23d88e2ee9568ba546c007c63d9131c1b"
 */
export function sha1(data: string | Buffer) {
    const hash = crypto.createHash("sha1");
    hash.update(data);
    return <string>hash.digest("hex");
}

/**
 * 计算指定数据的 MD5 值。
 * @param data 要计算的字符串或缓存。
 * @return 返回结果字符串。其中只包含小写十六进制数值。
 * @example md5("A") // "7fc56270e7a70fa81a5935b72eacbe29"
 */
export function md5(data: string | Buffer) {
    const hash = crypto.createHash("md5");
    hash.update(data);
    return <string>hash.digest("hex");
}
