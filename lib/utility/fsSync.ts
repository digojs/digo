/**
 * @fileOverview 文件系统(同步)
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import * as fs from "fs";
import { md5, sha1 } from "./crypto";

/**
 * 表示文件属性。
 */
export type Stats = fs.Stats;

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
 */
export function createDirSync(path: string, tryCount?: number) {
    try {
        fs.mkdirSync(path, 0o777);
    } catch (e) {
        if ((<NodeJS.ErrnoException>e).code === "EEXIST") {
            if (existsDirSync(path)) {
                return;
            }
            throw e;
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
        const child = np.join(path, entry);
        try {
            if (fs.lstatSync(child).isDirectory()) {
                deleteDirSync(child);
            } else {
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
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function deleteParentDirIfEmptySync(path: string, tryCount?: number) {
    for (let dir: string; (dir = np.dirname(path)) !== path; path = dir) {
        try {
            fs.rmdirSync(dir);
        } catch (e) {
            switch ((<NodeJS.ErrnoException>e).code) {
                case "ENOTEMPTY":
                case "ENOENT":
                case "EEXIST":
                case "EBUSY":
                    return;
                default:
                    if (tryCount === 0) {
                        throw e;
                    }
                    deleteParentDirIfEmptySync(path, tryCount == undefined ? 2 : tryCount - 1);
                    return;
            }
        }
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
export function getFilesSync(path: string, tryCount?: number): string[] {
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
 * 遍历指定的文件或文件夹。
 * @param path 要遍历的文件或文件夹路径。
 * @param options 遍历的选项。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function walkSync(path: string, options: WalkOptions, tryCount?: number) {
    processFileOrDir(np.resolve(path));
    options.end && options.end();

    function processFileOrDir(path: string) {
        try {
            var stats = getCache<Stats>(options.statsCache, path, fs.statSync);
        } catch (e) {
            return options.error && options.error(e);
        }

        if (stats.isFile()) {
            options.file && options.file(path, stats);
        } else if (stats.isDirectory()) {
            if (!options.dir || options.dir(path, stats) !== false) {
                processDir(path, stats);
            }
        } else {
            options.other && options.other(path, stats);
        }
    }

    function processDir(path: string, stats: fs.Stats) {
        try {
            var entries = getCache<string[]>(options.entriesCache, path, getFilesSync);
        } catch (e) {
            return options.error && options.error(e);
        }
        options.walk && options.walk(path, stats, entries);
        for (const entry of entries) {
            processFileOrDir(np.join(path, entry));
        }
    }

    function getCache<T>(cacheObject: { [path: string]: null | T | Function[] }, path: string, func: (path: string, tryCount?: number) => T) {
        if (cacheObject) {
            const cache = cacheObject[path];
            if (!cache || Array.isArray(cache) && typeof cache[0] === "function") {
                return cacheObject[path] = func(path, tryCount);
            }
            return <T>cache;
        }
        return func(path);
    }

}

/**
 * 表示遍历的选项。
 */
export interface WalkOptions {

    /**
     * 文件属性的缓存对象。
     */
    statsCache?: { [path: string]: null | Stats | ((path: string, error: NodeJS.ErrnoException, stats: fs.Stats) => void)[]; };

    /**
     * 文件列表的缓存对象。
     */
    entriesCache?: { [path: string]: null | string[] | ((path: string, error: NodeJS.ErrnoException, stats: fs.Stats, entries: string[]) => void)[] };

    /**
     * 处理一个文件的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     */
    file?(path: string, stats: fs.Stats): void;

    /**
     * 处理一个文件夹的回调函数。
     * @param path 当前文件夹的绝对路径。
     * @param stats 当前文件夹的属性对象。
     * @return 如果函数返回 false 表示不继续遍历此文件夹。
     */
    dir?(path: string, stats: fs.Stats): boolean | void;

    /**
     * 在遍历文件夹后的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     * @param entries 如果是文件夹则表示当前文件夹下的所有项。
     */
    walk?(path: string, stats: fs.Stats, entries?: string[]): void;

    /**
     * 处理一个其它类型文件的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     */
    other?(path: string, stats: fs.Stats): void;

    /**
     * 处理错误的回调函数。
     * @param error 出现的错误对象。
     */
    error?(error: NodeJS.ErrnoException): void;

    /**
     * 遍历结束的回调函数。
     */
    end?(): void;

}

/**
 * 读取文件内容。
 * @param path 要读取的文件路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回文件二进制内容。
 */
export function readFileSync(path: string, tryCount?: number): Buffer {
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
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyDirSync(from: string, to: string, tryCount?: number) {
    createDirSync(to, tryCount);
    for (const entry of getFilesSync(from, tryCount)) {
        const fromChild = np.join(from, entry);
        const toChild = np.join(to, entry);
        if (fs.statSync(fromChild).isDirectory()) {
            copyDirSync(fromChild, toChild, tryCount);
        } else {
            copyFileSync(fromChild, toChild, tryCount);
        }
    }
}

/**
 * 复制指定的文件。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyFileSync(from: string, to: string, tryCount?: number) {
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
        const buffer = Buffer.allocUnsafe(64 * 1024);
        let pos = 0;
        while (true) {
            const bytesRead = fs.readSync(fdr, buffer, 0, buffer.length, pos);
            pos += fs.writeSync(fdw, buffer, 0, bytesRead);
            if (bytesRead < buffer.length) break;
        }
    } catch (e) {
        if (tryCount === 0) {
            throw e;
        }
        return copyFileSync(from, to, tryCount == undefined ? 2 : tryCount - 1);
    } finally {
        if (fdw) fs.closeSync(fdw);
        if (fdr) fs.closeSync(fdr);
    }
}

/**
 * 移动指定的文件夹。
 * @param from 移动的源文件夹路径。
 * @param to 移动的目标文件夹路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function moveDirSync(from: string, to: string, tryCount?: number) {
    createDirSync(to, tryCount);
    for (const entry of getFilesSync(from, tryCount)) {
        const fromChild = np.join(from, entry);
        const toChild = np.join(to, entry);
        if (fs.statSync(fromChild).isDirectory()) {
            moveDirSync(fromChild, toChild, tryCount);
        } else {
            moveFileSync(fromChild, toChild, tryCount);
        }
    }
    deleteDirSync(from, tryCount);
}

/**
 * 移动指定的文件。
 * @param from 移动的源文件路径。
 * @param to 移动的目标文件路径。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function moveFileSync(from: string, to: string, tryCount?: number) {
    try {
        fs.renameSync(from, to);
    } catch (e) {
        copyFileSync(from, to, tryCount);
        deleteFileSync(from, tryCount);
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
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 * @return 返回校验码字符串。
 */
export function getChecksumSync(path: string, comparion = FileComparion.default, stats?: fs.Stats, buffer?: Buffer, tryCount?: number) {
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
            buffer = readFileSync(path, tryCount);
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
