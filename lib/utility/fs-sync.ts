/**
 * @fileOverview 文件系统(同步)
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import * as fs from "fs";
import { md5, sha1 } from "./crypto";

/**
 * 获取文件属性。
 * @param path 要获取的路径。
 * @return 返回文件属性对象。
 */
export function getStatSync(path: string) {
    return fs.statSync(path);
}

/**
 * 判断是否存在指定的文件夹。
 * @param path 要判断的路径。
 * @returns 如果指定的路径是文件夹则返回 true，否则返回 false。
 */
export function existsDirSync(path: string) {
    try {
        return fs.statSync(path).isDirectory();
    } catch (e) {
        return false;
    }
}

/**
 * 判断是否存在指定的文件。
 * @param path 要判断的路径。
 * @returns 如果指定的路径是文件则返回 true，否则返回 false。
 */
export function existsFileSync(path: string) {
    try {
        return fs.statSync(path).isFile();
    } catch (e) {
        return false;
    }
}

/**
 * 创建指定的文件夹。
 * @param path 要创建的文件夹路径。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @example createDir("foo/dir")
 */
export function createDirSync(path: string, tryCount?: number) {
    try {
        fs.mkdirSync(path, 0o777);
    } catch (e) {
        if ((<NodeJS.ErrnoException>e).code === "EEXIST") {
            if (!existsDirSync(path)) {
                throw e;
            }
            return;
        }
        if (tryCount === 0) {
            throw e;
        }
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            ensureParentDirSync(path);
        }
        createDirSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 确保已创建指定路径所在的文件夹。
 * @param path 要处理的路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @example ensureParentDir("foo/dir/a.txt")
 */
export function ensureParentDirSync(path: string, tryCount?: number) {
    createDirSync(np.dirname(path), tryCount);
}

/**
 * 删除指定的文件夹。
 * @param path 要删除的文件夹路径。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function deleteDirSync(path: string, tryCount?: number) {
    try {
        fs.rmdirSync(path);
    } catch (e) {
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            return;
        }
        if (tryCount === 0) {
            throw e;
        }
        cleanDirSync(path);
        deleteDirSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 清空指定的文件夹。
 * @param path 要清空的文件夹路径。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @returns 返回第一个出现的异常对象。如果没有异常则返回 null。
 */
export function cleanDirSync(path: string, tryCount?: number): NodeJS.ErrnoException {

    // 读取所有项。
    try {
        var entries = fs.readdirSync(path);
    } catch (e) {
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            return null;
        }
        if (tryCount === 0) {
            return e;
        }
        return cleanDirSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }

    // 依次删除。
    let result: NodeJS.ErrnoException = null;
    for (const entry of entries) {
        const child = path + np.sep + entry;
        try {
            const stats = fs.lstatSync(child);
            if (stats.isDirectory()) {
                deleteDirSync(child);
            } else if (stats.isFile() || stats.isSymbolicLink()) {
                deleteFileSync(child);
            }
        } catch (e) {
            if (!result) {
                result = e;
            }
        }
    }
    if (result && tryCount !== 0) {
        return cleanDirSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }
    return result;
}

/**
 * 如果父文件夹是空文件夹则删除。
 * @param path 要删除的文件路径。
 */
export function deleteParentDirIfEmptySync(path: string) {
    while (true) {
        const dir = np.dirname(path);
        if (dir === path) {
            break;
        }
        try {
            fs.rmdirSync(dir);
        } catch (e) {
            break;
        }
        path = dir;
    }
}

/**
 * 删除指定的文件。
 * @param path 要删除的文件路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function deleteFileSync(path: string, tryCount?: number) {
    try {
        fs.unlinkSync(path);
    } catch (e) {
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            return;
        }
        if (tryCount === 0) {
            throw e;
        }
        deleteFileSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。
 */
export function getFilesSync(path: string, tryCount?: number) {
    try {
        return fs.readdirSync(path);
    } catch (e) {
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            return [];
        }
        if (tryCount === 0) {
            throw e;
        }
        return getFilesSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 遍历指定的文件夹。
 * @param path 要遍历的文件夹路径。 
 * @param callback 遍历的回调函数。函数可以返回 false 终止深度遍历当前文件夹。 
 */
export function walkDirSync(path: string, callbacks: WalkDirCallbacks, statsCache?: { [name: string]: null | fs.Stats; }, entriesCache?: { [name: string]: null | string[] }) {
    processDir(np.resolve(path));
    callbacks.end && callbacks.end();

    function processDir(path: string) {

        try {
            var entries = entriesCache ? entriesCache[path] || (entriesCache[path] = getFilesSync(path)) : getFilesSync(path);
        } catch (e) {
            callbacks.error && callbacks.error(e);
            return;
        }

        const base = path.charAt(path.length - 1) === np.sep ? path : path + np.sep;
        for (const entry of entries) {
            processFileOrDir(base + entry);
        }

    }

    function processFileOrDir(path: string) {
        try {
            var stats = statsCache ? statsCache[path] || (statsCache[path] = fs.statSync(path)) : fs.statSync(path);
        } catch (e) {
            callbacks.error && callbacks.error(e);
            return;
        }

        if (stats.isFile()) {
            callbacks.file && callbacks.file(path, stats);
        } else if (stats.isDirectory()) {
            if (!callbacks.dir || callbacks.dir(path, stats) !== false) {
                processDir(path);
            }
        } else {
            callbacks.other && callbacks.other(path, stats);
        }
    }

}

/**
 * 遍历文件夹的回调函数。
 */
export interface WalkDirCallbacks {

    /**
     * 发现一个文件时的回调函数。
     * @param path 当前文件的路径。
     * @param stats 当前文件的状态对象。
     */
    file?(path: string, stats: fs.Stats): void;

    /**
     * 发现一个文件夹时的回调函数。
     * @param path 当前文件夹的路径。
     * @param stats 当前文件夹的状态对象。
     * @return 如果函数返回 false 表示不继续遍历此文件夹。 
     */
    dir?(path: string, stats: fs.Stats): boolean | void;

    /**
     * 发现一个其它类型文件时的回调函数。
     * @param path 当前文件的路径。
     * @param stats 当前文件的状态对象。
     */
    other?(path: string, stats: fs.Stats): void;

    /**
     * 出现错误时的回调函数。
     * @param error 出现的错误对象。
     */
    error?(error: NodeJS.ErrnoException): void;

    /**
     * 遍历结束时的回调函数。
     */
    end?(): void;

}

/**
 * 读取文件内容。
 * @param path 要读取的文件路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @return 返回文件二进制内容。
 */
export function readFileSync(path: string, tryCount?: number) {
    try {
        return fs.readFileSync(path);
    } catch (e) {
        if (tryCount === 0) {
            throw e;
        }
        return readFileSync(path, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 写入指定的文件。
 * @param path 要写入的文件路径。 
 * @param data 要写入的文件数据。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @example writeFile("foo/a.txt", "a")
 */
export function writeFileSync(path: string, data: string | Buffer, tryCount?: number) {
    try {
        fs.writeFileSync(path, data);
    } catch (e) {
        if (tryCount === 0) {
            throw e;
        }
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            ensureParentDirSync(path);
        }
        writeFileSync(path, data, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 在指定文件末尾追加内容。
 * @param path 要创建的文件路径。 
 * @param data 要写入的文件数据。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 * @example appendFile("foo/a.txt", "a")
 */
export function appendFileSync(path: string, data: string | Buffer, tryCount?: number) {
    try {
        fs.appendFileSync(path, data);
    } catch (e) {
        if (tryCount === 0) {
            throw e;
        }
        if ((<NodeJS.ErrnoException>e).code === "ENOENT") {
            ensureParentDirSync(path);
        }
        appendFileSync(path, data, tryCount == undefined ? 2 : tryCount - 1);
    }
}

/**
 * 复制指定的文件夹。
 * @param from 复制的源文件夹路径。
 * @param to 复制的目标文件夹路径。
 */
export function copyDirSync(from: string, to: string) {
    createDirSync(to);
    for (const entry of fs.readdirSync(from)) {
        const fromChild = from + np.sep + entry;
        const toChild = to + np.sep + entry;
        const stats = fs.lstatSync(fromChild);
        if (stats.isDirectory()) {
            copyDirSync(fromChild, toChild);
        } else if (stats.isFile()) {
            copyFileSync(fromChild, toChild);
        } else if (stats.isSymbolicLink()) {
            try {
                fs.symlinkSync(fs.realpathSync(fromChild), toChild);
            } catch (e) { }
        }
    }
}

/**
 * 复制指定的文件。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 */
export function copyFileSync(from: string, to: string) {
    try {
        var fdr = fs.openSync(from, 'r', 0o666);
        try {
            var fdw = fs.openSync(to, 'w', 0o666);
        } catch (e) {
            if ((<NodeJS.ErrnoException>e).code !== "ENOENT") {
                throw e;
            }
            ensureParentDirSync(to);
            fdw = fs.openSync(to, 'w', 0o666);
        }
        const buffer = new Buffer(64 * 1024);
        let pos = 0;
        while (true) {
            const bytesRead = fs.readSync(fdr, buffer, 0, buffer.length, pos);
            if (bytesRead === 0) break;
            pos += fs.writeSync(fdw, buffer, 0, bytesRead);
        }
    } finally {
        if (fdw) fs.closeSync(fdw);
        if (fdr) fs.closeSync(fdr);
    }
}

/**
 * 移动指定的文件夹。
 * @param from 移动的源文件夹路径。
 * @param to 移动的目标文件夹路径。
 */
export function moveDirSync(from: string, to: string) {
    createDirSync(to);
    for (const entry of fs.readdirSync(from)) {
        const fromChild = from + np.sep + entry;
        const toChild = to + np.sep + entry;
        const stats = fs.lstatSync(fromChild);
        if (stats.isDirectory()) {
            moveDirSync(fromChild, toChild);
        } else if (stats.isFile()) {
            moveFileSync(fromChild, toChild);
        } else if (stats.isSymbolicLink()) {
            try {
                fs.symlinkSync(fs.realpathSync(fromChild), toChild);
                fs.unlinkSync(fromChild);
            } catch (e) {

            }
        }
    }
    fs.rmdirSync(from);
}

/**
 * 移动指定的文件。
 * @param from 移动的源文件路径。
 * @param to 移动的目标文件路径。
 */
export function moveFileSync(from: string, to: string) {
    try {
        fs.renameSync(from, to);
    } catch (e) {
        copyFileSync(from, to);
        fs.unlinkSync(from);
    }
}

/**
 * 表示文件比较的算法。
 */
export const enum FileComparion {

    /**
     * 比较文件创建时间。
     */
    createTime = 1 << 0,

    /**
     * 比较最后访问时间。
     */
    lastAccessTime = 1 << 1,

    /**
     * 比较最后修改时间。
     */
    lastWriteTime = 1 << 2,

    /**
     * 比较文件大小。
     */
    size = 1 << 3,

    /**
     * 比较 SHA1 值。
     */
    sha1 = 1 << 10,

    /**
     * 比较 MD5 值。
     */
    md5 = 1 << 11,

    /**
     * 比较文件数据。
     */
    data = 1 << 12,

    /**
     * 默认比较算法。
     */
    default = FileComparion.createTime | FileComparion.lastWriteTime | FileComparion.size,

}

/**
 * 计算文件的校验码。
 * @param path 要计算的文件路径。
 * @param comparion 文件比较算法。
 * @param stats 提供文件的状态数据可以避免二次查询。
 * @param buffer 提供文件的内容可以避免二次查询。
 * @return 返回校验码字符串。
 */
export function getChecksumSync(path: string, comparion = FileComparion.default, stats?: fs.Stats, buffer?: Buffer) {
    const result = [];
    if (comparion & (FileComparion.createTime | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.size)) {
        if (!stats) {
            stats = fs.statSync(path);
        }
        if (comparion & FileComparion.createTime) {
            result.push((+stats.ctime).toString(36));
        }
        if (comparion & FileComparion.lastAccessTime) {
            result.push((+stats.atime).toString(36));
        }
        if (comparion & FileComparion.lastWriteTime) {
            result.push((+stats.mtime).toString(36));
        }
        if (comparion & FileComparion.size) {
            result.push(stats.size.toString(36));
        }
    }
    if (comparion & (FileComparion.sha1 | FileComparion.md5 | FileComparion.data)) {
        if (!buffer) {
            buffer = fs.readFileSync(path);
        }
        if (comparion & FileComparion.sha1) {
            result.push(sha1(buffer));
        }
        if (comparion & FileComparion.md5) {
            result.push(md5(buffer));
        }
        if (comparion & FileComparion.data) {
            result.push(buffer.toString("base64"));
        }
    }
    return result.join("|");
}
