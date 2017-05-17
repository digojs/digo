import * as nfs from "fs";
import * as np from "path";
import { md5, sha1 } from "./crypto";

/**
 * 表示文件或文件夹的属性对象。
 */
export type Stats = nfs.Stats;

/**
 * 获取文件或文件夹的属性，如果是链接则返回链接实际引用的文件属性。
 * @param path 要获取的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件属性对象。如果 *callback* 是函数则不返回。
 */
export function getStat(path: string, callback?: undefined, retry?: number): Stats;

/**
 * 获取文件或文件夹的属性，如果是链接则返回链接实际引用的文件属性。
 * @param path 要获取的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件属性对象。如果 *callback* 是函数则不返回。
 */
export function getStat(path: string, callback: (error: NodeJS.ErrnoException | null, stats: Stats) => void, retry?: number): void;

export function getStat(path: string, callback?: (error: NodeJS.ErrnoException | null, stats: Stats) => void, retry = 3) {
    return stat(nfs.stat, nfs.statSync, path, callback, retry);
}

/**
 * 获取文件或文件夹的属性，如果是链接则返回链接本身的属性。
 * @param path 要获取的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件属性对象。如果 *callback* 是函数则不返回。
 */
export function getStatLink(path: string, callback?: undefined, retry?: number): Stats;

/**
 * 获取文件或文件夹的属性，如果是链接则返回链接本身的属性。
 * @param path 要获取的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件属性对象。如果 *callback* 是函数则不返回。
 */
export function getStatLink(path: string, callback: (error: NodeJS.ErrnoException | null, stats: Stats) => void, retry?: number): void;

export function getStatLink(path: string, callback?: (error: NodeJS.ErrnoException | null, stats: Stats) => void, retry = 3) {
    return stat(nfs.lstat, nfs.lstatSync, path, callback, retry);
}

function stat(asyncFunc: typeof nfs.stat, syncFunc: typeof nfs.statSync, path: string, callback: undefined | ((error: NodeJS.ErrnoException | null, stats: Stats) => void), retry: number): any {
    if (typeof callback === "function") {
        asyncFunc(path, (error, stats) => {
            if (!error || error.code === "ENOENT" || retry === 0) {
                callback(error, stats);
            } else {
                setTimeout(stat, 7, asyncFunc, syncFunc, path, callback, retry - 1);
            }
        });
    } else {
        try {
            return syncFunc(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT" || retry === 0) {
                throw e;
            }
            return stat(asyncFunc, syncFunc, path, callback, retry - 1);
        }
    }
}

/**
 * 判断指定的文件夹是否已存在。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 如果指定的路径是文件夹则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsDir(path: string, callback?: undefined, retry?: number): boolean;

/**
 * 判断指定的文件夹是否已存在。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 如果指定的路径是文件夹则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsDir(path: string, callback: (result: boolean) => void, retry?: number): void;

export function existsDir(path: string, callback?: (result: boolean) => void, retry = 3) {
    return exists("isDirectory", path, callback, retry);
}

/**
 * 判断指定的文件是否已存在。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 如果指定的路径是文件则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsFile(path: string, callback?: undefined, retry?: number): boolean;

/**
 * 判断指定的文件是否已存在。
 * @param path 要判断的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 如果指定的路径是文件则返回 true，否则返回 false。如果 *callback* 是函数则不返回。
 */
export function existsFile(path: string, callback: (result: boolean) => void, retry?: number): void;

export function existsFile(path: string, callback?: (result: boolean) => void, retry = 3) {
    return exists("isFile", path, callback, retry);
}

function exists(funcName: "isDirectory" | "isFile", path: string, callback?: (result: boolean) => void, retry?: number) {
    if (typeof callback === "function") {
        getStatLink(path, (error, stats) => {
            callback(error ? false : stats[funcName]());
        }, retry);
    } else {
        try {
            return getStatLink(path, undefined, retry)[funcName]();
        } catch (e) {
            return false;
        }
    }
}

/**
 * 如果指定的路径已存在则执行重命名。
 * @param path 要测试的文件或文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 重试的次数。
 * @return 返回确认不存在的路径。如果 *callback* 是函数则不返回。
 */
export function ensureNewPath(path: string, callback?: undefined, startId?: number): string;

/**
 * 如果指定的路径已存在则执行重命名。
 * @param path 要测试的文件或文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 重试的次数。
 * @return 返回确认不存在的路径。如果 *callback* 是函数则不返回。
 */
export function ensureNewPath(path: string, callback?: (result: string) => void, startId?: number): void;

export function ensureNewPath(path: string, callback?: (result: string) => void, startId?: number) {
    const testPath = startId === undefined ? path : `${np.basename(path, np.extname(path))}_${startId}${np.extname(path)}`;
    if (typeof callback === "function") {
        nfs.exists(testPath, exists => {
            if (!exists) {
                callback(testPath);
            } else {
                ensureNewPath(path, callback, startId! + 1 || 1);
            }
        });
    } else {
        if (!nfs.existsSync(testPath)) {
            return testPath;
        }
        return ensureNewPath(path, undefined, startId! + 1 || 1);
    }
}

/**
 * 创建一个文件夹。
 * @param path 要创建的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function createDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.mkdir(path, 0o777 & ~process.umask(), error => {
            if (!error) {
                callback(null);
            } else if (error.code === "EEXIST") {
                existsDir(path, result => {
                    callback(result ? null : error);
                }, retry);
            } else if (retry === 0) {
                callback(error);
            } else if (error.code === "ENOENT") {
                ensureParentDir(path, () => {
                    createDir(path, callback, retry - 1);
                }, retry);
            } else {
                setTimeout(createDir, 7, path, callback, retry - 1);
            }
        });
    } else {
        try {
            nfs.mkdirSync(path, 0o777 & ~process.umask());
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "EEXIST") {
                if (existsDir(path, undefined, retry)) {
                    return;
                }
                throw e;
            }
            if (retry === 0) {
                throw e;
            }
            // FIXME: Win32: 如果路径中含非法字符，可能也会导致 ENOENT。
            // http://stackoverflow.com/questions/62771/how-do-i-check-if-a-given-string-is-a-legal-valid-file-name-under-windows/62888
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                try {
                    ensureParentDir(path, undefined, retry);
                } catch (e2) {

                }
            }
            createDir(path, undefined, retry - 1);
        }
    }
}

/**
 * 确保已创建指定路径所在的文件夹。
 * @param path 要处理的路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function ensureParentDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    createDir(np.dirname(path), callback, retry);
}

/**
 * 删除指定的文件夹。
 * @param path 要删除的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function deleteDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.rmdir(path, error => {
            if (!error || error.code === "ENOENT") {
                callback(null);
            } else if (error.code === "ENOTDIR" || retry === 0) {
                callback(error);
            } else if (error.code === "ENOTEMPTY" || error.code === "EEXIST") {
                cleanDir(path, () => {
                    deleteDir(path, callback, retry - 1);
                }, retry);
            } else {
                setTimeout(deleteDir, 7, path, callback, retry - 1);
            }
        });
    } else {
        try {
            nfs.rmdirSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                return;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOTDIR" || retry === 0) {
                throw e;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOTEMPTY" || (e as NodeJS.ErrnoException).code === "EEXIST") {
                cleanDir(path, undefined, retry);
            }
            deleteDir(path, undefined, retry - 1);
        }
    }
}

/**
 * 清空指定的文件夹。
 * @param path 要清空的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function cleanDir(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        readDirIf(path, (error, entries) => {
            if (!error) {
                let pending = entries.length;
                if (pending) {
                    const done = (e: NodeJS.ErrnoException | null) => {
                        if (e && !error) {
                            error = e;
                        }
                        if (--pending < 1) {
                            callback(error);
                        }
                    };
                    for (const entry of entries) {
                        const child = np.join(path, entry);
                        getStatLink(child, (error, stats) => {
                            if (error) {
                                done(error);
                            } else if (stats.isDirectory()) {
                                deleteDir(child, done, retry);
                            } else {
                                deleteFile(child, done, retry);
                            }
                        }, retry);
                    }
                } else {
                    callback(null);
                }
            } else {
                callback(error);
            }
        }, retry);
    } else {
        let error: NodeJS.ErrnoException | undefined;
        for (const entry of readDirIf(path, undefined, retry)) {
            const child = np.join(path, entry);
            try {
                if (getStatLink(child, undefined, retry).isDirectory()) {
                    deleteDir(child, undefined, retry);
                } else {
                    deleteFile(child, undefined, retry);
                }
            } catch (e) {
                if (!error) {
                    error = e;
                }
            }
        }
        if (error) {
            throw error;
        }
    }
}

/**
 * 如果父文件夹是空文件夹则删除。
 * @param path 文件夹内的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function deleteParentDirIfEmpty(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    const parent = np.dirname(path);
    if (typeof callback === "function") {
        if (parent !== path) {
            nfs.rmdir(parent, error => {
                if (!error) {
                    deleteParentDirIfEmpty(parent, callback, retry);
                } else {
                    switch (error.code) {
                        case "ENOTEMPTY":
                        case "ENOENT":
                        case "EEXIST":
                        case "EBUSY":
                            callback(null);
                            break;
                        default:
                            if (retry === 0) {
                                callback(error);
                            } else {
                                setTimeout(deleteParentDirIfEmpty, 7, path, callback, retry - 1);
                            }
                            break;
                    }
                }
            });
        } else {
            callback(null);
        }
    } else if (parent !== path) {
        try {
            nfs.rmdirSync(parent);
        } catch (e) {
            switch ((e as NodeJS.ErrnoException).code) {
                case "ENOTEMPTY":
                case "ENOENT":
                case "EEXIST":
                case "EBUSY":
                    return;
                default:
                    if (retry === 0) {
                        throw e;
                    }
                    deleteParentDirIfEmpty(path, undefined, retry - 1);
                    return;
            }
        }
        deleteParentDirIfEmpty(parent, undefined, retry);
    }
}

/**
 * 删除指定的文件，如果文件不存在则直接返回。
 * @param path 要删除的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function deleteFile(path: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.unlink(path, error => {
            if (!error || error.code === "ENOENT") {
                callback(null);
            } else if (error.code === "EISDIR" || retry === 0) {
                callback(error);
            } else {
                setTimeout(deleteFile, 7, path, callback, retry - 1);
            }
        });
    } else {
        try {
            nfs.unlinkSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                return;
            }
            if ((e as NodeJS.ErrnoException).code === "EISDIR" || retry === 0) {
                throw e;
            }
            deleteFile(path, undefined, retry - 1);
        }
    }
}

/**
 * 读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function readDir(path: string, callback?: undefined, retry?: number): string[];

/**
 * 读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function readDir(path: string, callback: (error: NodeJS.ErrnoException | null, entries: string[]) => void, retry?: number): void;

export function readDir(path: string, callback?: (error: NodeJS.ErrnoException | null, entries: string[]) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.readdir(path, (error, entries) => {
            if (!error || error.code === "ENOTDIR" || error.code === "ENOENT") {
                callback(error, entries);
                resolve();
            } else {
                switch (error.code) {
                    case "EMFILE":
                    case "ENFILE":
                        delay(readDir, [path, callback, retry - 1]);
                        break;
                    default:
                        if (retry === 0) {
                            callback(error, null!);
                            resolve();
                        } else {
                            setTimeout(readDir, 7, path, callback, retry - 1);
                        }
                        break;
                }
            }
        });
    } else {
        try {
            return nfs.readdirSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT" || (e as NodeJS.ErrnoException).code === "ENOTDIR" || retry === 0) {
                throw e;
            }
            return readDir(path, undefined, retry - 1);
        }
    }
}

/**
 * 读取文件夹内的所有项，如果文件夹不存在则返回空列表。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function readDirIf(path: string, callback?: undefined, retry?: number): string[];

/**
 * 读取文件夹内的所有项，如果文件夹不存在则返回空列表。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function readDirIf(path: string, callback: (error: NodeJS.ErrnoException | null, entries: string[]) => void, retry?: number): void;

/**
 * 读取文件夹内的所有项，如果文件夹不存在则返回空列表。
 * @param path 要读取的文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件夹内所有项。如果文件夹不存在则返回空数组。如果 *callback* 是函数则不返回。
 */
export function readDirIf(path: string, callback?: (error: NodeJS.ErrnoException | null, entries: string[]) => void, retry = 3) {
    return readIf(readDir, () => [], path, callback, retry);
}

/**
 * 深度遍历指定的文件或文件夹并执行回调。
 * @param path 要遍历的文件或文件夹路径。
 * @param options 遍历的选项。
 * @param retry 操作失败后自动重试的次数。
 */
export function walk(path: string, options: WalkOptions, retry = 3) {
    if (options.end) {
        let pending = 0;
        const processFileOrDir = (path: string) => {
            pending++;
            if (options.stats) {
                let cache = options.stats[path];
                if (cache) {
                    if (Array.isArray(cache)) {
                        cache.push(statCallback);
                    } else {
                        statCallback(path, null, cache);
                    }
                } else {
                    options.stats[path] = cache = [statCallback];
                    (options.follow ? getStat : getStatLink)(path, (error, stats) => {
                        options.stats![path] = stats;
                        for (const func of cache as (typeof statCallback)[]) {
                            func(path, error, stats);
                        }
                    }, retry);
                }
            } else {
                (options.follow ? getStat : getStatLink)(path, (error, stats) => {
                    statCallback(path, error, stats);
                }, retry);
            }
        };
        const statCallback = (path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats) => {
            if (error) {
                options.error && options.error(error);
            } else if (stats.isFile()) {
                options.file && options.file(path, stats);
            } else if (stats.isDirectory()) {
                if (!options.dir || options.dir(path, stats) !== false) {
                    processDir(path, stats);
                }
            } else {
                options.other && options.other(path, stats);
            }
            if (--pending < 1) {
                options.end!();
            }
        };
        const processDir = (path: string, stats: nfs.Stats) => {
            pending++;
            if (options.entries) {
                let cache = options.entries[path];
                if (cache) {
                    if (typeof cache[0] === "function") {
                        (cache as (typeof readDirCallback)[]).push(readDirCallback);
                    } else {
                        readDirCallback(path, null, stats, cache as string[]);
                    }
                } else {
                    options.entries[path] = cache = [readDirCallback];
                    readDir(path, (error, entries) => {
                        options.entries![path] = entries;
                        for (const func of cache as (typeof readDirCallback)[]) {
                            func(path, error, stats, entries);
                        }
                    }, retry);
                }
            } else {
                readDir(path, (error, entries) => {
                    readDirCallback(path, error, stats, entries);
                }, retry);
            }
        };
        const readDirCallback = (path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats, entries: string[]) => {
            if (error) {
                options.error && options.error(error);
            } else {
                if (!options.walk || options.walk(path, stats, entries) !== false) {
                    for (const entry of entries) {
                        processFileOrDir(np.join(path, entry));
                    }
                }
            }
            if (--pending < 1) {
                options.end!();
            }
        };
        processFileOrDir(path);
    } else {
        const processFileOrDir = (path: string) => {
            let stats: Stats;
            try {
                stats = getCache<Stats>(options.stats, path) || getStat(path, undefined, retry);
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
        };
        const processDir = (path: string, stats: nfs.Stats) => {
            let entries: string[];
            try {
                entries = getCache<string[]>(options.entries, path) || readDir(path, undefined, retry);
            } catch (e) {
                return options.error && options.error(e);
            }
            if (!options.walk || options.walk(path, stats, entries) !== false) {
                for (const entry of entries) {
                    processFileOrDir(np.join(path, entry));
                }
            }
        };
        const getCache = <T>(cacheObject: { [path: string]: T | Function[] } | undefined, path: string) => {
            if (cacheObject) {
                const cache = cacheObject[path];
                if (cache && (!Array.isArray(cache) || typeof cache[0] !== "function")) {
                    return cache as T;
                }
            }
        };
        processFileOrDir(path);
    }

}

/**
 * 表示遍历的选项。
 */
export interface WalkOptions {

    /**
     * 是否解析链接。
     */
    follow?: boolean;

    /**
     * 所有文件属性的缓存对象。
     */
    stats?: { [path: string]: Stats | ((path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats) => void)[]; };

    /**
     * 所有文件列表的缓存对象。
     */
    entries?: { [path: string]: string[] | ((path: string, error: NodeJS.ErrnoException | null, stats: nfs.Stats, entries: string[]) => void)[] };

    /**
     * 在遍历文件夹前的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     * @param entries 当前文件夹下的所有项。
     * @return 如果函数返回 false 表示不继续遍历此文件夹。
     */
    walk?(path: string, stats: nfs.Stats, entries?: string[]): boolean | void;

    /**
     * 处理一个文件的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     */
    file?(path: string, stats: nfs.Stats): void;

    /**
     * 处理一个文件夹的回调函数。
     * @param path 当前文件夹的绝对路径。
     * @param stats 当前文件夹的属性对象。
     * @return 如果函数返回 false 表示不继续遍历此文件夹。
     */
    dir?(path: string, stats: nfs.Stats): boolean | void;

    /**
     * 处理一个其它类型文件的回调函数。
     * @param path 当前文件的绝对路径。
     * @param stats 当前文件的属性对象。
     */
    other?(path: string, stats: nfs.Stats): void;

    /**
     * 处理错误的回调函数。
     * @param error 出现的错误对象。
     */
    error?(error: NodeJS.ErrnoException): void;

    /**
     * 遍历结束的回调函数。
     */
    end?(data?: any): void;

}

/**
 * 读取指定的文件内容。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFile(path: string, callback?: undefined, retry?: number): Buffer;

/**
 * 读取指定的文件内容。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFile(path: string, callback: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, retry?: number): void;

export function readFile(path: string, callback?: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.readFile(path, (error, buffer) => {
            if (!error || error.code === "EISDIR" || error.code === "ENOENT" || retry === 0) {
                callback(error, buffer);
                resolve();
            } else {
                switch (error.code) {
                    case "EMFILE":
                    case "ENFILE":
                        delay(readFile, [path, callback, retry - 1]);
                        break;
                    default:
                        setTimeout(readFile, 7, path, callback, retry - 1);
                        break;
                }
            }
        });
    } else {
        try {
            return nfs.readFileSync(path);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code === "ENOENT" || (e as NodeJS.ErrnoException).code === "EISDIR" || retry === 0) {
                throw e;
            }
            return readFile(path, undefined, retry - 1);
        }
    }
}

/**
 * 读取指定的文件内容，如果文件不存在则返回空数据。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFileIf(path: string, callback?: undefined, retry?: number): Buffer;

/**
 * 读取指定的文件内容，如果文件不存在则返回空数据。
 * @param path 要读取的文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回文件二进制内容。如果 *callback* 是函数则不返回。
 */
export function readFileIf(path: string, callback: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, retry?: number): void;

export function readFileIf(path: string, callback?: (error: NodeJS.ErrnoException | null, buffer: Buffer) => void, retry = 3) {
    return readIf(readFile, () => Buffer.allocUnsafe(0), path, callback, retry);
}

/**
 * 写入指定的文件内容。
 * @param path 要写入的文件路径。
 * @param data 要写入的文件数据。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function writeFile(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    return write(nfs.writeFile, nfs.writeFileSync, path, data, callback, retry);
}

/**
 * 写入指定的文件内容，如果文件已存在则不写入。
 * @param path 要写入的文件路径。
 * @param data 要写入的文件数据。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function writeFileIf(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    writeIf(writeFile, path, path, data, callback, retry);
}

/**
 * 在指定文件末尾追加内容。
 * @param path 要创建的文件路径。
 * @param data 要写入的文件数据。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function appendFile(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    return write(nfs.appendFile, nfs.appendFileSync, path, data, callback, retry);
}

function write(asyncFunc: typeof nfs.writeFile, syncFunc: typeof nfs.writeFileSync, path: string, data: any, callback: ((error: NodeJS.ErrnoException | null) => void) | undefined, retry: number) {
    if (typeof callback === "function") {
        asyncFunc(path, data, error => {
            if (!error || retry === 0) {
                callback(error);
                resolve();
            } else {
                switch (error.code) {
                    case "ENOENT":
                        ensureParentDir(path, () => {
                            write(asyncFunc, syncFunc, path, data, callback, retry - 1);
                        }, retry);
                        break;
                    case "EMFILE":
                    case "ENFILE":
                        delay(write, [asyncFunc, syncFunc, path, data, callback, retry - 1]);
                        break;
                    default:
                        setTimeout(write, 7, asyncFunc, syncFunc, path, data, callback, retry - 1);
                        break;
                }
            }
        });
    } else {
        try {
            syncFunc(path, data);
        } catch (e) {
            if (retry === 0) {
                throw e;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                try {
                    ensureParentDir(path, undefined, retry);
                } catch (e2) {

                }
            }
            write(asyncFunc, syncFunc, path, data, undefined, retry - 1);
        }
    }
}

/**
 * 创建一个链接。
 * @param path 要创建的文件路径。
 * @param target 要链接的目标路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function createLink(path: string, target: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        existsFile(target, result => {
            const done = (error?: NodeJS.ErrnoException | null) => {
                if (!error || retry === 0) {
                    callback(error!);
                } else {
                    switch (error.code) {
                        case "ENOENT":
                            ensureParentDir(path, () => {
                                createLink(path, target, callback, retry - 1);
                            }, retry);
                            break;
                        default:
                            setTimeout(createLink, 7, path, target, callback, retry - 1);
                            break;
                    }
                }
            };
            if (result) {
                nfs.link(target, path, done);
            } else {
                nfs.symlink(target, path, "junction", done);
            }
        }, retry);
    } else {
        try {
            if (existsFile(target, undefined, retry)) {
                nfs.linkSync(target, path);
            } else {
                nfs.symlinkSync(target, path, "junction");
            }
        } catch (e) {
            if (retry === 0) {
                throw e;
            }
            if ((e as NodeJS.ErrnoException).code === "ENOENT") {
                try {
                    ensureParentDir(path, undefined, retry);
                } catch (e2) { }
            }
            createLink(path, target, undefined, retry - 1);
        }
    }
}

/**
 * 创建一个链接，如果文件已存在则不写入。
 * @param path 要创建的文件路径。
 * @param target 要链接的目标路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function createLinkIf(path: string, target: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    writeIf(createLink, path, path, target, callback, retry);
}

/**
 * 读取链接的实际地址。
 * @param path 要读取的链接路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回路径。如果 *callback* 是函数则不返回。
 */
export function readLink(path: string, callback?: undefined, retry?: number): string;

/**
 * 读取链接的实际地址。
 * @param path 要读取的链接路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回路径。如果 *callback* 是函数则不返回。
 */
export function readLink(path: string, callback?: (error: NodeJS.ErrnoException | null, link: string) => void, retry?: number): void;

export function readLink(path: string, callback?: (error: NodeJS.ErrnoException | null, link: string) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.readlink(path, (error, link) => {
            if (error) {
                if (retry === 0) {
                    callback(error, null!);
                } else {
                    readLink(path, callback, retry - 1);
                }
            } else {
                callback(error, link);
            }
        });
    } else {
        try {
            return nfs.readlinkSync(path);
        } catch (e) {
            if (retry === 0) {
                throw e;
            }
            return readLink(path, callback, retry - 1);
        }
    }
}

/**
 * 读取链接的实际地址，如果文件不存在则返回空数据。
 * @param path 要读取的链接路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回路径。如果 *callback* 是函数则不返回。
 */
export function readLinkIf(path: string, callback?: undefined, errorIfNotFound?: boolean, retry?: number): string;

/**
 * 读取链接的实际地址，如果文件不存在则返回空数据。
 * @param path 要读取的链接路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回路径。如果 *callback* 是函数则不返回。
 */
export function readLinkIf(path: string, callback?: (error: NodeJS.ErrnoException | null, link: string) => void, errorIfNotFound?: boolean, retry?: number): void;

export function readLinkIf(path: string, callback?: (error: NodeJS.ErrnoException | null, link: string) => void, errorIfNotFound = true, retry = 3) {
    return readIf(readLink, () => "", path, callback, retry);
}

/**
 * 复制指定的文件夹。
 * @param from 复制的源文件夹路径。
 * @param to 复制的目标文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function copyDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    copyFiles(from, to, callback, true, retry);
}

/**
 * 复制指定的文件夹，如果文件已存在则不复制。
 * @param from 复制的源文件夹路径。
 * @param to 复制的目标文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function copyDirIf(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    copyFiles(from, to, callback, false, retry);
}

function copyFiles(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, overwrite?: boolean, retry?: number) {
    if (typeof callback === "function") {
        createDir(to, error => {
            if (error) {
                callback(error);
            } else {
                readDir(from, (error, entries) => {
                    if (error || !entries.length) {
                        callback(error);
                    } else {
                        let pending = entries.length;
                        const done = (e: NodeJS.ErrnoException) => {
                            if (e && !error) {
                                error = e;
                            }
                            if (--pending < 1) {
                                callback(error);
                            }
                        };
                        for (const entry of entries) {
                            const fromChild = np.join(from, entry);
                            getStatLink(fromChild, (error, stats) => {
                                if (error) {
                                    done(error);
                                } else {
                                    const toChild = np.join(to, entry);
                                    if (stats.isDirectory()) {
                                        copyFiles(fromChild, toChild, done, overwrite, retry);
                                    } else if (stats.isSymbolicLink()) {
                                        overwrite ? copyLink(fromChild, toChild, done, retry) : copyLinkIf(fromChild, toChild, done, retry);
                                    } else {
                                        overwrite ? copyFile(fromChild, toChild, done, retry) : copyFileIf(fromChild, toChild, done, retry);
                                    }
                                }
                            }, retry);
                        }
                    }
                }, retry);
            }
        }, retry);
    } else {
        createDir(to, undefined, retry);
        let error: NodeJS.ErrnoException | undefined;
        for (const entry of readDir(from, undefined, retry)) {
            const fromChild = np.join(from, entry);
            const toChild = np.join(to, entry);
            try {
                const stats = getStatLink(fromChild, undefined, retry);
                if (stats.isDirectory()) {
                    copyFiles(fromChild, toChild, undefined, overwrite, retry);
                } else if (stats.isSymbolicLink()) {
                    overwrite ? copyLink(fromChild, toChild, undefined, retry) : copyLinkIf(fromChild, toChild, undefined, retry);
                } else {
                    overwrite ? copyFile(fromChild, toChild, undefined, retry) : copyFileIf(fromChild, toChild, undefined, retry);
                }
            } catch (e) {
                if (!error) {
                    error = e;
                }
            }
        }
        if (error) {
            throw error;
        }
    }
}

/**
 * 复制指定的文件。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function copyFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    let fdr: number | undefined;
    let fdw: number | undefined;
    if (typeof callback === "function") {
        const open = (path: string, read: boolean, retry = 3) => {
            nfs.open(path, read ? "r" : "w", 0o666, (error, fd) => {
                if (error) {
                    switch (error.code) {
                        case "EMFILE":
                        case "ENFILE":
                            delay(open, [path, read, retry - 1]);
                            break;
                        case "ENOENT":
                            if (!read && retry > 0) {
                                ensureParentDir(path, () => open(path, read, retry - 1), retry);
                                break;
                            }
                        // 继续执行
                        default:
                            if (retry === 0) {
                                end(error);
                            } else {
                                setTimeout(open, 7, path, read, retry - 1);
                            }
                    }
                } else {
                    if (read) {
                        fdr = fd;
                    } else {
                        fdw = fd;
                    }
                    if (fdr !== undefined && fdw !== undefined) {
                        copy(Buffer.allocUnsafe(64 * 1024), 0, retry);
                    }
                    resolve();
                }
            });
        };
        const copy = (buffer: Buffer, pos: number, retry = 3) => {
            nfs.read(fdr!, buffer, 0, buffer.length, pos, (error, bytesRead, buffer) => {
                if (error) {
                    if (retry === 0) {
                        end(error);
                    } else {
                        setTimeout(copy, 7, buffer, pos, retry - 1);
                    }
                } else if (bytesRead === 0) {
                    end(error);
                } else {
                    nfs.write(fdw!, buffer, 0, bytesRead, (error, writen, buffer) => {
                        if (error) {
                            if (retry === 0) {
                                end(error);
                            } else {
                                setTimeout(copy, 7, buffer, pos, retry - 1);
                            }
                        } else if (writen < buffer.length) {
                            end(error);
                        } else {
                            copy(buffer, pos + writen, retry);
                        }
                    });
                }
            });
        };
        const end = (error: NodeJS.ErrnoException) => {
            if (fdw != undefined) {
                nfs.close(fdw, () => {
                    fdw = undefined;
                    if (fdr == undefined) {
                        callback(error);
                    }
                });
            }
            if (fdr != undefined) {
                nfs.close(fdr, () => {
                    fdr = undefined;
                    if (fdw == undefined) {
                        callback(error);
                    }
                });
            }
        };
        open(from, true, retry);
        open(to, false, retry);
    } else {
        try {
            fdr = nfs.openSync(from, "r", 0o666);
            try {
                fdw = nfs.openSync(to, "w", 0o666);
            } catch (e) {
                if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
                    throw e;
                }
                ensureParentDir(to, undefined, retry);
                fdw = nfs.openSync(to, "w", 0o666);
            }
            const buffer = Buffer.allocUnsafe(64 * 1024);
            let pos = 0;
            while (true) {
                const bytesRead = nfs.readSync(fdr, buffer, 0, buffer.length, pos);
                pos += nfs.writeSync(fdw, buffer, 0, bytesRead);
                if (bytesRead < buffer.length) {
                    break;
                }
            }
        } catch (e) {
            if (retry === 0) {
                throw e;
            }
            copyFile(from, to, undefined, retry - 1);
            return;
        } finally {
            if (fdw) {
                nfs.closeSync(fdw);
            }
            if (fdr) {
                nfs.closeSync(fdr);
            }
        }
    }
}

/**
 * 复制指定的文件，如果文件已存在则不复制。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function copyFileIf(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    writeIf(copyFile, to, from, to, callback, retry);
}

/**
 * 复制指定的链接。
 * @param from 复制的源链接。
 * @param to 复制的目标链接。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function copyLink(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        readLink(from, (error, link) => {
            if (error) {
                callback(error);
            } else {
                createLink(to, link, callback, retry);
            }
        }, retry);
    } else {
        createLink(to, readLink(from, undefined, retry), undefined, retry);
    }
}

/**
 * 复制指定的链接，如果文件已存在则不复制。
 * @param from 复制的源链接。
 * @param to 复制的目标链接。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function copyLinkIf(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    writeIf(copyLink, to, from, to, callback, retry);
}

function readIf(func: (path: string, callback?: (error: NodeJS.ErrnoException | null, data: any) => void, retry?: number) => any, defaultValue: () => any, path: string, callback: undefined | ((error: NodeJS.ErrnoException | null, data: any) => void), retry: number) {
    if (typeof callback === "function") {
        func(path, (error, data) => {
            if (error && error.code === "ENOENT") {
                callback(null, defaultValue());
            } else {
                callback(error, data);
            }
        }, retry);
    } else {
        try {
            return func(path, undefined, retry);
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
                throw e;
            }
        }
        return defaultValue();
    }
}

function writeIf(func: typeof writeFile, checkPath: string, path: string, data: any, callback?: (error: NodeJS.ErrnoException | null) => void, retry?: number) {
    if (typeof callback === "function") {
        getStatLink(checkPath, error => {
            if (error && error.code === "ENOENT") {
                func(path, data, callback, retry);
            } else {
                callback(error);
            }
        }, retry);
    } else {
        try {
            getStatLink(checkPath, undefined, retry);
            return;
        } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
                throw e;
            }
        }
        func(path, data, undefined, retry);
    }
}

/**
 * 移动指定的文件夹。
 * @param from 移动的源文件夹路径。
 * @param to 移动的目标文件夹路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function moveDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        createDir(to, error => {
            if (error) {
                callback(error);
            } else {
                readDir(from, (error, entries) => {
                    if (error || !entries.length) {
                        callback(error);
                    } else {
                        let pending = entries.length;
                        const done = (e: NodeJS.ErrnoException) => {
                            if (e && !error) {
                                error = e;
                            }
                            if (--pending < 1) {
                                deleteDir(from, e => {
                                    if (e && !error) {
                                        error = e;
                                    }
                                    callback(error);
                                }, retry);
                            }
                        };
                        for (const entry of entries) {
                            const fromChild = np.join(from, entry);
                            getStatLink(fromChild, (error, stats) => {
                                if (error) {
                                    done(error);
                                } else {
                                    const toChild = np.join(to, entry);
                                    if (stats.isDirectory()) {
                                        moveDir(fromChild, toChild, done, retry);
                                    } else if (stats.isSymbolicLink()) {
                                        copyLink(fromChild, toChild, error => {
                                            if (error) {
                                                done(error);
                                            } else {
                                                deleteFile(toChild, done);
                                            }
                                        }, retry);
                                    } else {
                                        moveFile(fromChild, toChild, done, retry);
                                    }
                                }
                            }, retry);
                        }
                    }
                }, retry);
            }
        }, retry);
    } else {
        createDir(to, undefined, retry);
        let error: NodeJS.ErrnoException | void;
        for (const entry of readDir(from, undefined, retry)) {
            const fromChild = np.join(from, entry);
            const toChild = np.join(to, entry);
            try {
                const stats = getStatLink(fromChild, undefined, retry);
                if (stats.isDirectory()) {
                    moveDir(fromChild, toChild, undefined, retry);
                } else if (stats.isSymbolicLink()) {
                    copyLink(fromChild, toChild, undefined, retry);
                    deleteFile(toChild);
                } else {
                    moveFile(fromChild, toChild, undefined, retry);
                }
            } catch (e) {
                if (!error) {
                    error = e;
                }
            }
        }
        if (error) {
            throw error;
        }
        deleteDir(from, undefined, retry);
    }
}

/**
 * 移动指定的文件。
 * @param from 移动的源文件路径。
 * @param to 移动的目标文件路径。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param retry 操作失败后自动重试的次数。
 */
export function moveFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException | null) => void, retry = 3) {
    if (typeof callback === "function") {
        nfs.rename(from, to, error => {
            if (!error) {
                callback(null);
            } else {
                copyFile(from, to, error => {
                    if (error) {
                        callback(error);
                    } else {
                        deleteFile(from, callback, retry);
                    }
                }, retry);
            }
        });
    } else {
        try {
            nfs.renameSync(from, to);
        } catch (e) {
            copyFile(from, to, undefined, retry);
            deleteFile(from, undefined, retry);
        }
    }
}

/**
 * 计算指定文件的校验码。
 * @param path 要计算的文件路径。
 * @param comparion 文件比较算法。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param stats 提供文件的状态数据可以避免二次查询。
 * @param buffer 提供文件的内容可以避免二次查询。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回校验码字符串。如果 *callback* 是函数则不返回。
 */
export function getChecksum(path: string, comparion?: FileComparion, callback?: undefined, stats?: nfs.Stats, buffer?: Buffer, retry?: number): string;

/**
 * 计算指定文件的校验码。
 * @param path 要计算的文件路径。
 * @param comparion 文件比较算法。
 * @param callback 异步操作完成后的回调函数。如果不是函数则以同步的方式执行。
 * @param stats 提供文件的状态数据可以避免二次查询。
 * @param buffer 提供文件的内容可以避免二次查询。
 * @param retry 操作失败后自动重试的次数。
 * @return 返回校验码字符串。如果 *callback* 是函数则不返回。
 */
export function getChecksum(path: string, comparion: FileComparion, callback: (error: NodeJS.ErrnoException | null, result: string) => void, stats?: nfs.Stats, buffer?: Buffer, retry?: number): void;

export function getChecksum(path: string, comparion = FileComparion.default, callback?: (error: NodeJS.ErrnoException | null, result: string) => void, stats?: nfs.Stats, buffer?: Buffer, retry = 3) {
    const parts: string[] = [];
    if (comparion & (FileComparion.createTime | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.size)) {
        if (!stats) {
            if (typeof callback === "function") {
                getStat(path, (error, stats) => {
                    if (error) {
                        callback(error, null!);
                    } else {
                        getChecksum(path, comparion, callback, stats, buffer, retry);
                    }
                }, retry);
                return;
            } else {
                stats = getStat(path, undefined, retry);
            }
        }
        if (comparion & FileComparion.createTime) {
            parts.push((+stats.birthtime).toString(36));
        }
        if (comparion & FileComparion.lastAccessTime) {
            parts.push((+stats.atime).toString(36));
        }
        if (comparion & FileComparion.lastChangeTime) {
            parts.push((+stats.ctime).toString(36));
        }
        if (comparion & FileComparion.lastWriteTime) {
            parts.push((+stats.mtime).toString(36));
        }
        if (comparion & FileComparion.size) {
            parts.push(stats.size.toString(36));
        }
    }
    if (comparion & (FileComparion.sha1 | FileComparion.md5 | FileComparion.data)) {
        if (!buffer) {
            if (typeof callback === "function") {
                readFile(path, (error, buffer) => {
                    if (error) {
                        callback(error, null!);
                    } else {
                        getChecksum(path, comparion, callback, stats, buffer, retry);
                    }
                }, retry);
                return;
            } else {
                buffer = readFile(path, undefined, retry);
            }
        }
        if (comparion & FileComparion.sha1) {
            parts.push(sha1(buffer));
        }
        if (comparion & FileComparion.md5) {
            parts.push(md5(buffer));
        }
        if (comparion & FileComparion.data) {
            parts.push(buffer.toString("base64"));
        }
    }
    const checksum = parts.join("|");
    if (typeof callback === "function") {
        callback(null, checksum);
    } else {
        return checksum;
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
     * 比较最后修改时间。
     */
    lastChangeTime = 1 << 3,

    /**
     * 比较文件大小。
     */
    size = 1 << 4,

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
 * 表示一个调用参数。
 */
interface Arguments extends Array<any> {

    /**
     * 获取当前调用的函数。
     */
    callee?: Function;

    /**
     * 下一个延时调用。
     */
    next?: Arguments;

}

/**
 * 表示一个已延时的调用链表尾。
 */
var delayed: Arguments | undefined;

/**
 * 全局回调计时器。
 */
var timer: NodeJS.Timer | undefined;

/**
 * 延时执行指定的函数。
 * @param func 要执行的函数。
 * @param args 要执行的参数。
 */
function delay(func: Function, args: Arguments) {
    args.callee = func;
    const end = delayed;
    if (end) {
        args.next = end.next;
        end.next = delayed = args;
    } else {
        args.next = delayed = args;
    }
    // 如果直接调用原生的 fs 函数导致了文件打开过多，
    // 则可能不会执行已延时的函数，
    // 等待一段时间后强制重新执行。
    if (!timer) {
        timer = setTimeout(resolve, 7000);
    }
}

/**
 * 执行一个已延时的函数。
 */
function resolve() {
    if (delayed) {
        const head = delayed.next!;
        if (head === delayed) {
            delayed = undefined;
        } else {
            delayed.next = head.next;
        }
        head.callee!(...head);
        if (timer) {
            clearTimeout(timer);
            timer = undefined;
        }
    }
}
