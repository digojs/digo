/**
 * @fileOverview 创建文件
 * @author xuld <xuld@vip.qq.com>
 */
import { asyncQueue } from "./then";
import { FileList } from "./fileList";
import { File } from "./file";

/**
 * 创建一个新的文件。
 * @param path 文件的路径。
 * @param data 文件的数据。
 * @returns 返回一个文件列表。
 */
export function create(path: string, data?: string | Buffer) {
    const result = new FileList(asyncQueue);
    const file = new File();
    file.path = path;
    file.data = data || "";
    result.add(file);
    result.end();
    return result;
}
