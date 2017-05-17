import * as np from "path";

/**
 * 解析指定路径对应的绝对路径。
 * @param path 要解析的路径。
 * @return 返回已解析的绝对路径。路径末尾多余的分隔符会被删除。
 * @example resolvePath("../relative")
 */
export function resolvePath(path: string): string;

/**
 * 解析指定路径对应的绝对路径。
 * @param base 要解析的基路径。
 * @param path 要解析的路径。
 * @return 返回已解析的绝对路径。路径末尾多余的分隔符会被删除。
 * @example resolvePath("foo/goo/hoo", "../relative")
 */
export function resolvePath(base: string, path: string): string;

export function resolvePath(base: string, path?: string) {
    return np.resolve(base, path || "");
}

/**
 * 解析指定路径对应的相对路径。
 * @param path 要解析的路径。
 * @return 返回已解析的相对路径。路径固定以 `/` 作为分隔符。路径末尾多余的分隔符会被删除。
 * @example relativePath("foo/goo/hoo")
 */
export function relativePath(path: string): string;

/**
 * 解析指定路径对应的相对路径。
 * @param base 要解析的基路径。
 * @param path 要解析的路径。
 * @return 返回已解析的相对路径。路径固定以 `/` 作为分隔符。路径末尾多余的分隔符会被删除。
 * @example relativePath("foo/goo/hoo", "foo/goo/relative") // "../relative"
 */
export function relativePath(base: string, path?: string): string;

export function relativePath(base: string, path?: string) {
    if (path === undefined) {
        path = base;
        base = "";
    }
    path = np.relative(base, path);
    return np.sep === "\\" ? path.replace(/\\/g, "/") : path;
}

/**
 * 规范化指定的路径格式，删除路径中多余的 `./` 和 `../`。
 * @param path 要处理的路径。
 * @return 返回已处理的路径。路径固定以 `/` 作为分隔符。路径末尾的分隔符会被保留。
 * @example normalizePath("foo/") // "foo/"
 * @example normalizePath("./foo.js") // "foo.js"
 */
export function normalizePath(path: string) {
    path = np.normalize(path);
    return np.sep === "\\" ? path.replace(/\\/g, "/") : path;
}

/**
 * 判断指定的路径是否是绝对路径。
 * @param path 要判断的路径。
 * @return 如果是绝对路径则返回 true，否则返回 false。
 * @example isAbsolutePath("foo") // false
 */
export function isAbsolutePath(path: string) {
    return np.isAbsolute(path);
}

/**
 * 获取指定路径的文件夹部分。
 * @param path 要处理的路径。
 * @return 返回文件夹路径。
 * @example getDir("/root/foo.txt") // "/root/"
 */
export function getDir(path: string) {
    return np.dirname(path);
}

/**
 * 设置指定路径的文件夹部分。
 * @param path 要处理的路径。
 * @param value 要设置的新文件夹路径。
 * @return 返回已处理的路径。
 * @example setDir("/root/foo.txt", "goo") // "goo/foo.txt"
 */
export function setDir(path: string, value: string) {
    return np.join(value, np.basename(path));
}

/**
 * 获取指定路径的文件名部分。
 * @param path 要处理的路径。
 * @param ext 如果为 true 则包含扩展名，否则不包含扩展名(包括点)。
 * @return 返回文件名路径。
 * @example getFileName("/root/foo.txt") // "foo.txt"
 */
export function getFileName(path: string, ext = true) {
    return np.basename(path, ext === false ? np.extname(path) : undefined);
}

/**
 * 设置指定路径的文件名部分。
 * @param path 要处理的路径。
 * @param value 要更改的新文件名。
 * @param ext 如果为 true 则同时更改扩展名，否则保留原扩展名(包括点)。
 * @return 返回已处理的路径。如果源路径不含扩展名则自动追加到文件名末尾。
 * @example setFileName("/root/foo.txt", "goo.jpg") // "/root/goo.jpg"
 * @example setFileName("/root/foo.txt", "goo", false) // "/root/goo.jpg"
 */
export function setFileName(path: string, value: string, ext = true) {
    const base = np.basename(path);
    return path.slice(0, path.lastIndexOf(base)) + value + (ext === false ? np.extname(base) : "");
}

/**
 * 在指定路径的文件名前追加内容。
 * @param path 要处理的路径。
 * @param value 要追加的内容。
 * @return 返回已处理的路径。
 * @example prependFileName("foo/goo.txt", "fix_") // "foo/fix_goo.txt"
 */
export function prependFileName(path: string, value: string) {
    return setFileName(path, value + getFileName(path));
}

/**
 * 在指定路径的文件名后追加内容。
 * @param path 要处理的路径。
 * @param value 要追加的内容。
 * @return 返回已处理的路径。
 * @example appendFileName("foo/goo.txt", "_fix") // "foo/goo_fix.txt"
 */
export function appendFileName(path: string, value: string) {
    const base = np.basename(path);
    const dot = base.indexOf(".");
    return path.slice(0, path.lastIndexOf(base)) + (dot < 0 ? base : base.substr(0, dot)) + value + (dot < 0 ? "" : base.substr(dot));
}

/**
 * 获取指定路径的扩展名(包括点)部分。
 * @param path 要处理的地址。
 * @return 返回扩展名(包括点)。如果文件名以点前缀，则返回空。
 * @example getExt("/root/foo.txt") // ".txt"
 */
export function getExt(path: string) {
    return np.extname(path);
}

/**
 * 设置指定路径的扩展名(包括点)部分。
 * @param path 要处理的路径。
 * @param value 要更改的新扩展名(包括点)。
 * @return 返回已处理的路径。如果源路径不含扩展名则自动追加。
 * @example setExt("/root/foo.txt", ".jpg") // "/root/foo.jpg"
 * @example setExt("/root/foo", ".jpg") // "/root/foo.jpg"
 * @example setExt("/root/foo.txt", "") // "/root/foo"
 */
export function setExt(path: string, value: string) {
    return path.substr(0, path.length - np.extname(path).length) + value;
}

/**
 * 判断两个路径是否相同。
 * @param path1 要判断的第一个路径。
 * @param path2 要判断的第二个路径。
 * @return 如果相同则返回 true，否则返回 false。
 * @example pathEquals("/root", "/root") // true
 */
export function pathEquals(path1: string | null, path2: string | null) {
    if (path1 == null || path2 == null) {
        return path1 === path2;
    }
    return np.sep === "\\" ? path1.toLowerCase() === path2.toLowerCase() : path1 === path2;
}

/**
 * 判断一个文件夹是否包含指定的路径。
 * @param parent 要判断的文件夹路径。
 * @param child 要判断的子文件或文件夹路径。
 * @return 如果 *parent* 包含 *child* 则返回 true，否则返回 false。
 * @example inDir("/root", "/root/foo") // true
 * @example inDir("/root/foo", "/root/goo") // false
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
 * @return 返回公共文件夹绝对路径。如果没有相同部分则返回 null。
 * @example commonDir("/root/foo", "/root/foo/goo") // "/root/foo"
 */
export function commonDir(path1: string | null, path2: string | null) {
    if (path1 == null || path2 == null) {
        return null;
    }
    path1 = np.resolve(path1);
    path2 = np.resolve(path2);

    // 确保 path1.length <= path2.length
    if (path1.length > path2.length) {
        const t = path1;
        path1 = path2;
        path2 = t;
    }

    // 计算相同的开头部分，以分隔符为界。
    let index = -1;
    const sepCode = np.sep.charCodeAt(0);
    for (var i = 0; i < path1.length; i++) {
        let ch1 = path1.charCodeAt(i);
        let ch2 = path2.charCodeAt(i);

        // 如果不区分大小写则将 ch1 和 ch2 全部转小写。
        if (sepCode === 92/*\*/) {
            if (ch1 >= 65 /*A*/ && ch1 <= 90/*Z*/) {
                ch1 |= 0x20;
            }
            if (ch2 >= 65 /*A*/ && ch2 <= 90/*Z*/) {
                ch2 |= 0x20;
            }
        }

        // 发现不同字符后终止。
        if (ch1 !== ch2) {
            break;
        }

        // 如果发现一个分隔符，则标记之前的内容是公共部分。
        if (ch1 === sepCode) {
            index = i;
        }
    }

    // 特殊处理：path1 = "foo", path2 = "foo" 或 "foo/goo"
    if (i === path1.length && (i === path2.length || path2.charCodeAt(i) === sepCode)) {
        return path1;
    }
    return index < 0 ? null : path1.substr(0, index);
}
