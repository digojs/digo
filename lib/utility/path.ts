/**
 * @fileOverview 路径
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";

/**
 * 解析路径对应的绝对路径。
 * @param base (可选)要解析的基路径。默认为当前工作目录。
 * @param path 要解析的路径。
 * @returns 返回已解析的路径。路径末尾多余的分隔符会被删除。
 * @example resolvePath('a/b/c', "../d")
 */
export function resolvePath(base: string, path?: string) {
    return np.resolve(base, path || "");
}

/**
 * 解析路径对应的相对路径。
 * @param base (可选)要解析的基路径。默认为当前工作目录。
 * @param path 要解析的路径。
 * @returns 返回已解析的路径。路径以 `/` 作为分隔符。路径末尾多余的分隔符会被删除。
 * @example relativePath('a/b/c', "a/b/d") // "../d"
 */
export function relativePath(base: string, path?: string) {
    if (path == undefined) {
        path = base;
        base = "";
    }
    path = np.relative(base, path);
    if (!path) return ".";
    if (np.sep == "\\") path = path.replace(/\\/g, "/");
    return path;
}

/**
 * 规范指定的路径格式。
 * @param path 要处理的路径。
 * @returns 返回已处理的路径。路径以 `/` 作为分隔符。路径末尾会保留原分隔符。
 * @example normalizePath('abc/') // 'abc/'
 * @example normalizePath('./abc.js') // 'abc.js'
 */
export function normalizePath(path: string) {
    path = np.normalize(path);
    if (np.sep == "\\") path = path.replace(/\\/g, "/");
    return path;
}

/**
 * 判断指定的路径是否是绝对路径。
 * @param path 要判断的路径。
 * @returns 如果是绝对路径则返回 true，否则返回 false。
 * @example isAbsolutePath('abc') // false
 */
export function isAbsolutePath(path: string) {
    return np.isAbsolute(path);
}

/**
 * 获取指定路径的文件夹部分。
 * @param path 要处理的路径。
 * @returns 返回文件夹路径。
 * @example getDir("/user/root/a.txt") // "/user/root"
 */
export function getDir(path: string) {
    return np.dirname(path);
}

/**
 * 设置指定路径的文件夹部分。
 * @param path 要处理的路径。
 * @param dir 要设置的新文件夹路径。
 * @returns 返回已处理的路径。
 * @example setDir("/user/root/a.txt", "my") // "my/a.txt"
 */
export function setDir(path: string, dir: string) {
    return np.join(dir, np.basename(path));
}

/**
 * 获取指定路径的文件名部分。
 * @param path 要处理的路径。
 * @param ext 如果为 true (默认)则包含扩展名，否则不包含扩展名(包括点)。
 * @returns 返回文件名路径。
 * @example getFileName("/user/root/a.txt") // "a.txt"
 */
export function getFileName(path: string, ext?: boolean) {
    return np.basename(path, ext !== false ? undefined : np.extname(path));
}

/**
 * 设置指定路径的文件名部分。
 * @param path 要处理的路径。
 * @param fileName 要更改的新文件名。
 * @param ext 如果为 true (默认)则同时更改扩展名，否则保留原扩展名(包括点)。
 * @returns 返回已处理的路径。如果源路径不含扩展名则自动追加。
 * @example setFileName("/user/root/a.txt", "b.jpg") // "/user/root/b.jpg")
 * @example setFileName("/user/root/a.txt", "b", false) // "/user/root/b.jpg")
 */
export function setFileName(path: string, fileName: string, ext?: boolean) {
    const base = np.basename(path);
    return path.slice(0, path.lastIndexOf(base)) + fileName + (ext !== false ? "" : np.extname(base));
}

/**
 * 在指定路径中的文件名前追加内容。
 * @param path 要处理的路径。
 * @param value 要追加的内容。
 * @returns 返回已处理的路径。
 * @example prependFileName("a/b.txt", "my_") // "a/my_b.txt"
 */
export function prependFileName(path: string, value: string) {
    return setFileName(path, value + getFileName(path));
}

/**
 * 在指定路径中的文件名后追加内容。
 * @param path 要处理的路径。
 * @param value 要追加的内容。
 * @returns 返回已处理的路径。
 * @example appendFileName("a/b.txt", "_123") // "a/b_123.txt"
 */
export function appendFileName(path: string, value: string) {
    const base = np.basename(path);
    const dot = base.indexOf('.');
    return path.slice(0, path.lastIndexOf(base)) + (dot < 0 ? base : base.substr(0, dot)) + value + (dot < 0 ? "" : base.substr(dot));
}

/**
 * 获取指定路径的扩展名部分。
 * @param path 要处理的地址。
 * @returns 返回扩展名(含点)。如果文件名以点前缀，则返回空。
 * @example getExt("/user/root/a.txt") // ".txt"
 */
export function getExt(path: string) {
    return np.extname(path);
}

/**
 * 更改指定路径的扩展名部分。
 * @param path 要处理的路径。
 * @param ext 要更改的新扩展名。
 * @returns 返回已处理的路径。如果源路径不含扩展名则自动追加。
 * @example setExt("/user/root/a.txt", ".jpg") // "/user/root/a.jpg")
 * @example setExt("/user/root/a", ".jpg") // "/user/root/a.jpg")
 * @example setExt("/user/root/a.txt", "") // "/user/root/a")
 */
export function setExt(path: string, ext: string) {
    return path.substr(0, path.length - np.extname(path).length) + ext;
}

/**
 * 判断两个路径是否相同。
 * @param path1 要判断的第一个路径。
 * @param path2 要判断的第二个路径。
 * @return 如果相同则返回 true，否则返回 false。
 */
export function pathEquals(path1: string | null, path2: string | null) {
    if (path1 == null || path2 == null) {
        return path1 == path2;
    }
    if (np.sep === "\\") {
        path1 = path1.toLowerCase();
        path2 = path2.toLowerCase();
    }
    return path1 === path2;
}

/**
 * 判断一个文件夹是否包含指定的路径。
 * @param parent 要判断的文件夹路径。
 * @param child 要判断的子文件或文件夹路径。
 * @returns 如果包含返回 true，否则返回 false。
 * @remark 提供的两个路径必须都是绝对路径或相对路径。
 * @example inDir("/user/root", "/user/root/a") // true
 * @example inDir("/user/a", "/user/ab") // false
 */
export function inDir(parent: string, child: string) {

    parent = np.resolve(parent);
    child = np.resolve(child);

    if (child.length < parent.length) {
        return false;
    }

    if (np.sep === "\\") {
        parent = parent.toLowerCase();
        child = child.toLowerCase();
    }

    if (child.length === parent.length) {
        return child === parent;
    }

    if (parent.charAt(parent.length - 1) !== np.sep) {
        parent += np.sep;
    }

    return child.startsWith(parent);
}

/**
 * 获取两个路径中的公共文件夹。
 * @param path1 要处理的第一个路径。
 * @param path2 要处理的第二个路径。
 * @return 返回公共文件夹绝对路径(末尾含分隔符)。如果没有相同部分则返回空字符串。
 */
export function commonDir(path1: string, path2: string) {

    if (!path1 || !path2) {
        return "";
    }

    path1 = np.resolve(path1);
    path2 = np.resolve(path2);

    // 计算相同的开头部分，以分隔符为界。
    let index = -1;
    const ignoreCase = np.sep === "\\";
    for (let i = 0; i < path1.length && i < path2.length; i++) {
        let ch1 = path1.charCodeAt(i);
        let ch2 = path2.charCodeAt(i);

        // 不区分大小写。
        if (ignoreCase) {
            if (ch1 >= 65/*A*/ && ch1 <= 90/*Z*/) ch1 |= 0x20;
            if (ch2 >= 65/*A*/ && ch2 <= 90/*Z*/) ch2 |= 0x20;
        }

        // 发现不同字符后终止。
        if (ch1 !== ch2) {
            break;
        }

        // 如果发现一个分隔符，则之前的内容认为是公共头。
        if (ch1 === 47/*/*/ || ch1 === 92/*\*/) {
            index = i;
        }

    }

    return index < 0 ? "" : path1.substr(0, index + 1);
}
