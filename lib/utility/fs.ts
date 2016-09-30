/**
 * @fileOverview 文件系统(异步)
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import * as fs from "fs";
import { WalkDirCallbacks, FileComparion, getChecksumSync } from "./fs-sync";

/**
 * 表示文件属性。
 */
export type Stats = fs.Stats;

/**
 * 异步获取文件属性。
 * @param path 要获取的路径。 
 * @param callback 操作完成后的回调函数。 
 */
export function getStat(path: string, callback?: (error: NodeJS.ErrnoException, stats: fs.Stats) => void) {
    fs.stat(path, callback);
}

/**
 * 异步判断是否存在指定的文件夹。
 * @param path 要判断的路径。
 * @param callback 操作完成后的回调函数。 
 */
export function existsDir(path: string, callback?: (result: boolean) => void) {
    fs.stat(path, callback ? (error, stats) => callback(error ? false : stats.isDirectory()) : undefined);
}

/**
 * 异步判断是否存在指定的文件。
 * @param path 要判断的路径。
 * @param callback 操作完成后的回调函数。 
 */
export function existsFile(path: string, callback?: (result: boolean) => void) {
    fs.stat(path, callback ? (error, stats) => callback(error ? false : stats.isFile()) : undefined);
}

/**
 * 异步创建指定的文件夹。
 * @param path 要创建的文件夹路径。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function createDir(path: string, callback: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.mkdir(path, 0o777, error => {
        if (error) {
            if (error.code === "EEXIST") {
                return callback && fs.lstat(path, (error, stats) => {
                    if (stats && stats.isDirectory()) {
                        error = null;
                    }
                    callback(error);
                });
            }
            if (tryCount === 0) {
                return callback && callback(error);
            }
            if (error.code === "ENOENT") {
                return ensureParentDir(path, error => {
                    if (error) {
                        return callback && callback(error);
                    }
                    createDir(path, callback, tryCount == undefined ? 1 : tryCount - 1);
                });
            }
            return createDir(path, callback, tryCount == undefined ? 2 : tryCount - 1);
        }
        callback && callback(error);
    });
}

/**
 * 异步确保已创建指定路径所在的文件夹。
 * @param path 要处理的路径。
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function ensureParentDir(path: string, callback: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    return createDir(np.dirname(path), callback, tryCount);
}

/**
 * 异步删除指定的文件夹。
 * @param path 要删除的文件夹路径。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function deleteDir(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.rmdir(path, error => {
        if (error) {
            if (error.code === "ENOENT") {
                return callback && callback(null);
            }
            if (tryCount === 0) {
                return callback && callback(error);
            }
            return cleanDir(path, error => {
                if (error) {
                    return callback && callback(error);
                }
                deleteDir(path, callback, tryCount == undefined ? 1 : tryCount - 1);
            });
        }
        callback && callback(error);
    });
}

/**
 * 异步清空指定的文件夹。
 * @param path 要清空的文件夹路径。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function cleanDir(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    getFiles(path, (error, entries) => {
        if (error || !entries.length) {
            return callback && callback(error);
        }

        let resultError: NodeJS.ErrnoException = null;
        let count = entries.length;
        let eachCallback = error => {
            if (error && !resultError) resultError = error;
            if (--count === 0) {
                if (resultError) {
                    if (tryCount === 0) {
                        return callback && callback(resultError);
                    }
                    return cleanDir(path, callback, tryCount == undefined ? 2 : tryCount - 1);
                }
                callback && callback(resultError);
            }
        };
        for (const entry of entries) {
            const child = path + np.sep + entry;
            fs.lstat(child, (error, stats) => {
                if (error) {
                    return eachCallback(error);
                }
                if (stats.isDirectory()) {
                    deleteDir(child, eachCallback);
                } else if (stats.isFile() || stats.isSymbolicLink()) {
                    deleteFile(child, eachCallback);
                }
            });
        }
    });
}

/**
 * 如果父文件夹是空文件夹则异步删除。
 * @param path 要删除的文件路径。
 * @param callback 操作完成后的回调函数。 
 */
export function deleteParentDirIfEmpty(path: string, callback?: (error: NodeJS.ErrnoException) => void) {
    const dir = np.dirname(path);
    if (dir === path) {
        return callback && callback(null);
    }

    fs.rmdir(dir, error => {
        if (error) {
            return callback && callback(error.code === "ENOTEMPTY" || error.code === "ENOENT" || error.code === "EEXIST" ? null : error);
        }
        deleteParentDirIfEmpty(dir, callback);
    });
}

/**
 * 异步删除指定的文件。
 * @param path 要删除的文件路径。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function deleteFile(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.unlink(path, error => {
        if (error) {
            if (error.code === "ENOENT") {
                return callback && callback(null);
            }
            if (tryCount === 0) {
                return callback && callback(error);
            }
            return deleteFile(path, callback, tryCount == undefined ? 2 : tryCount - 1);
        }
        callback && callback(error);
    });
}

/**
 * 异步读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function getFiles(path: string, callback?: (error: NodeJS.ErrnoException, entries: string[]) => void, tryCount?: number) {
    fs.readdir(path, (error, entries) => {
        if (error) {
            switch (error.code) {
                case "EMFILE":
                case "ENFILE":
                    return delay(getFiles, [path, callback, tryCount]);
                case "ENOENT":
                    return callback && callback(null, []);
                default:
                    if (tryCount === 0) {
                        return callback && callback(error, null);
                    }
                    return getFiles(path, callback, tryCount == undefined ? 2 : tryCount - 1);
            }
        }
        callback && callback(error, entries);
        resolve();
    });
}

/**
 * 异步遍历指定的文件夹。
 * @param path 要遍历的文件夹路径。 
 * @param callbacks 遍历的回调函数。
 * @param cache 缓存对象，用于在多次遍历时共享数据。
 */
export function walkDir(path: string, callbacks: WalkDirCallbacks, statsCache?: { [name: string]: null | fs.Stats | Function[]; }, entriesCache?: { [name: string]: null | string[] | Function[] }) {
    let pending = 1;
    processDir(np.resolve(path));
    if (--pending === 0) callbacks.end && callbacks.end();

    function processDir(path: string) {
        pending++;

        if (entriesCache) {
            const cache = entriesCache[path];
            if (cache) {
                if (typeof cache[0] === "function") {
                    (<Function[]>cache).push(getFilesCallback);
                } else {
                    getFilesCallback(path, null, <string[]>cache);
                }
                return;
            }
            entriesCache[path] = [getFilesCallback];
        }

        getFiles(path, (error, entries) => {
            if (entriesCache) {
                const cache = <Function[]>entriesCache[path];
                entriesCache[path] = entries;
                for (const func of cache) {
                    func(error, entries);
                }
            } else {
                getFilesCallback(path, error, entries);
            }
        });
    }

    function getFilesCallback(path: string, error: NodeJS.ErrnoException, entries: string[]) {
        if (error) {
            callbacks.error && callbacks.error(error);
        } else {
            const base = path.charAt(path.length - 1) === np.sep ? path : path + np.sep;
            for (const entry of entries) {
                processFileOrDir(base + entry);
            }
        }
        if (--pending === 0) callbacks.end && callbacks.end();
    }

    function processFileOrDir(path: string) {
        pending++;

        if (statsCache) {
            const cache = statsCache[path];
            if (cache) {
                if (Array.isArray(cache)) {
                    cache.push(statCallback);
                } else {
                    statCallback(path, null, cache);
                }
                return;
            }
            statsCache[path] = [statCallback];
        }

        fs.stat(path, (error, stats) => {
            if (statsCache) {
                const cache = <Function[]>statsCache[path];
                statsCache[path] = stats;
                for (const func of cache) {
                    func(path, error, stats);
                }
            } else {
                statCallback(path, error, stats);
            }
        });
    }

    function statCallback(path: string, error: NodeJS.ErrnoException, stats: fs.Stats) {
        if (error) {
            callbacks.error && callbacks.error(error);
        } else if (stats.isFile()) {
            callbacks.file && callbacks.file(path, stats);
        } else if (stats.isDirectory()) {
            if (!callbacks.dir || callbacks.dir(path, stats) !== false) {
                processDir(path);
            }
        } else {
            callbacks.other && callbacks.other(path, stats);
        }
        if (--pending === 0) callbacks.end && callbacks.end();
    }

}

/**
 * 异步读取文件内容。
 * @param path 要读取的文件路径。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function readFile(path: string, callback: (error: NodeJS.ErrnoException, buffer: Buffer) => void, tryCount?: number) {
    fs.readFile(path, (error, buffer) => {
        if (error) {
            switch (error.code) {
                case "EMFILE":
                case "ENFILE":
                    return delay(readFile, [path, callback, tryCount]);
                default:
                    if (tryCount === 0) {
                        return callback && callback(error, null);
                    }
                    return readFile(path, callback, tryCount == undefined ? 2 : tryCount - 1);
            }
        }
        callback && callback(error, buffer);
        resolve();
    });
}

/**
 * 异步写入指定的文件。
 * @param path 要写入的文件路径。 
 * @param data 要写入的文件数据。
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function writeFile(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.writeFile(path, data, error => {
        if (error) {
            switch (error.code) {
                case "EMFILE":
                case "ENFILE":
                    return delay(writeFile, [path, data, callback, tryCount]);
                case "ENOENT":
                    return ensureParentDir(path, error => {
                        if (error || tryCount === 0) {
                            return callback && callback(error);
                        }
                        writeFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
                    });
                default:
                    if (tryCount === 0) {
                        return callback && callback(error);
                    }
                    return writeFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
            }
        }
        callback && callback(error);
        resolve();
    });
}

/**
 * 异步在指定文件末尾追加内容。
 * @param path 要创建的文件路径。 
 * @param data 要写入的文件数据。 
 * @param callback 操作完成后的回调函数。 
 * @param tryCount 操作失败后自动重试的次数，默认为 3。 
 */
export function appendFile(path: string, data: string | Buffer, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.appendFile(path, data, error => {
        if (error) {
            switch (error.code) {
                case "EMFILE":
                case "ENFILE":
                    return delay(appendFile, [path, data, callback, tryCount]);
                case "ENOENT":
                    return ensureParentDir(path, error => {
                        if (error || tryCount === 0) {
                            return callback && callback(error);
                        }
                        appendFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
                    });
                default:
                    if (tryCount === 0) {
                        return callback && callback(error);
                    }
                    return appendFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
            }
        }
        callback && callback(error);
        resolve();
    });
}

/**
 * 异步复制指定的文件夹。
 * @param from 复制的源文件夹路径。
 * @param to 复制的目标文件夹路径。
 * @param callback 操作完成后的回调函数。 
 */
export function copyDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void) {
    createDir(to, error => {
        if (error) {
            return callback && callback(error);
        }

        getFiles(from, (error, entries) => {
            if (error || !entries.length) {
                return callback && callback(error);
            }
            let resultError: NodeJS.ErrnoException = null;
            let count = entries.length;
            let eachCallback = error => {
                if (error && !resultError) resultError = error;
                if (--count === 0) callback && callback(resultError);
            };
            for (const entry of entries) {
                const fromChild = from + np.sep + entry;
                const toChild = to + np.sep + entry;
                fs.lstat(fromChild, (error, stats) => {
                    if (error) {
                        return eachCallback(error);
                    }
                    if (stats.isDirectory()) {
                        copyDir(fromChild, toChild, eachCallback);
                    } else if (stats.isFile()) {
                        copyFile(fromChild, toChild, eachCallback);
                    } else if (stats.isSymbolicLink()) {
                        fs.realpath(fromChild, (error, link) => {
                            if (error) {
                                return eachCallback(null);
                            }
                            fs.symlink(link, toChild, undefined, eachCallback);
                        });
                    }
                });
            }
        });
    });

}

/**
 * 异步复制指定的文件。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param callback 操作完成后的回调函数。 
 */
export function copyFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void) {

    function open(path: string, mode: string, createDir: boolean, cb: (error: NodeJS.ErrnoException, fd: number) => void, tryCount?: number) {
        fs.open(path, mode, 0o666, (error, fd) => {
            if (error) {
                switch (error.code) {
                    case "EMFILE":
                    case "ENFILE":
                        return delay(open, [path, mode, createDir, cb, tryCount]);
                    case "EAGAIN":
                    case "EPERM":
                    case "EACCESS":
                        if (tryCount === 0) {
                            return cb(error, fd);
                        }
                        return open(path, mode, createDir, cb, tryCount == undefined ? 1 : tryCount - 1);
                    case "ENOENT":
                        if (createDir) {
                            return ensureParentDir(path, error => {
                                if (error) {
                                    return cb(error, fd);
                                }
                                open(path, mode, false, cb, tryCount);
                            });
                        }
                }
            }
            cb(error, fd);
            resolve();
        });
    }

    function close(fdr: number, fdw: number, error: NodeJS.ErrnoException) {
        let count = 2;
        let resultError: NodeJS.ErrnoException = error;
        let eachCallback = error => {
            if (error && !resultError) resultError = error;
            if (--count === 0) callback && callback(resultError);
            resolve();
        };
        fs.close(fdw, eachCallback);
        fs.close(fdr, eachCallback);
    }

    open(from, 'r', false, (error, fdr) => {
        if (error) {
            return callback && callback(error);
        }
        open(to, 'w', true, (error, fdw) => {
            if (error) {
                return fs.close(fdr, () => {
                    callback && callback(error);
                    resolve();
                });
            }
            function copyBlock(buffer, pos) {
                fs.read(fdr, buffer, 0, buffer.length, pos, (error, bytesRead, buffer) => {
                    if (error || bytesRead === 0) {
                        return close(fdr, fdw, error);
                    }
                    fs.write(fdw, buffer, 0, bytesRead, (error, writen, buffer) => {
                        if (error || writen === 0) {
                            return close(fdr, fdw, error);
                        }
                        copyBlock(buffer, pos + writen);
                    });
                });
            }
            copyBlock(new Buffer(64 * 1024), 0);
        });

    });
}

/**
 * 异步移动指定的文件夹。
 * @param from 移动的源文件夹路径。
 * @param to 移动的目标文件夹路径。
 * @param callback 操作完成后的回调函数。 
 */
export function moveDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void) {
    createDir(to, error => {
        if (error) {
            return callback && callback(error);
        }
        getFiles(from, (error, entries) => {
            if (error) {
                return callback && callback(error);
            }
            if (!entries.length) {
                return fs.rmdir(from, callback);
            }
            let resultError: NodeJS.ErrnoException = null;
            let count = entries.length;
            let eachCallback = error => {
                if (error) resultError = error;
                if (--count === 0) {
                    if (resultError) {
                        return callback && callback(resultError);
                    }
                    fs.rmdir(from, callback ? error => callback(resultError || error) : undefined);
                }
            };
            for (const entry of entries) {
                const fromChild = from + np.sep + entry;
                const toChild = to + np.sep + entry;
                fs.lstat(fromChild, (error, stats) => {
                    if (error) {
                        return eachCallback(error);
                    }
                    if (stats.isDirectory()) {
                        moveDir(fromChild, toChild, eachCallback);
                    } else if (stats.isFile()) {
                        moveFile(fromChild, toChild, eachCallback);
                    } else if (stats.isSymbolicLink()) {
                        fs.realpath(fromChild, (error, link) => {
                            if (error) {
                                return eachCallback(error);
                            }
                            fs.symlink(link, toChild, undefined, error => {
                                if (error) {
                                    return eachCallback(null);
                                }
                                fs.unlink(toChild, eachCallback);
                            });
                        });
                    }
                });
            }
        });
    });
}

/**
 * 异步移动指定的文件。
 * @param from 移动的源文件路径。
 * @param to 移动的目标文件路径。
 * @param callback 操作完成后的回调函数。 
 */
export function moveFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void) {
    fs.rename(from, to, error => {
        if (error) {
            return copyFile(from, to, error => {
                if (error) {
                    return callback && callback(error);
                }
                fs.unlink(from, callback);
            });
        }
        callback && callback(error);
    });
}

/**
 * 异步计算文件的校验码。
 * @param path 要计算的文件路径。
 * @param comparion 文件比较算法。
 * @param stats 提供文件的状态数据可以避免二次查询。
 * @param buffer 提供文件的内容可以避免二次查询。
 * @param callback 操作完成后的回调函数。 
 */
export function getChecksum(path: string, comparion = FileComparion.default, callback: (error: NodeJS.ErrnoException, result: string) => void, stats?: fs.Stats, buffer?: Buffer) {
    if ((comparion & (FileComparion.createTime | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.size)) && !stats) {
        return fs.stat(path, (error, stats) => {
            if (error) {
                return callback(error, null);
            }
            getChecksum(path, comparion, callback, stats, buffer);
        });
    }
    if ((comparion & (FileComparion.sha1 | FileComparion.md5 | FileComparion.data)) && !buffer) {
        return readFile(path, (error, buffer) => {
            if (error) {
                return callback(error, null);
            }
            getChecksum(path, comparion, callback, stats, buffer);
        });
    }
    callback(null, getChecksumSync(path, comparion, stats, buffer));
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
var delayed: Arguments;

/**
 * 全局回调计时器。
 */
var timer: NodeJS.Timer;

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
    // 如果直接调用原生的 fs 函数导致了文件打开过多，则可能不会执行已延时的函数，
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
        const head = delayed.next;
        if (head === delayed) {
            delayed = null;
        } else {
            delayed.next = head.next;
        }
        head.callee.apply(this, head);
    } else if (timer) {
        clearTimeout(timer);
        timer = null;
    }
}
