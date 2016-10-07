/**
 * @fileOverview 文件系统(异步)
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import * as fs from "fs";
import { Stats, WalkOptions, FileComparion, getChecksumSync } from "./fsSync";

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
export function createDir(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.mkdir(path, 0o777, error => {
        if (error) {
            if (error.code === "EEXIST") {
                return callback && existsDir(path, result => callback(result ? null : error));
            }
            if (tryCount === 0) {
                return callback && callback(error);
            }
            if (error.code === "ENOENT") {
                return ensureParentDir(path, error => {
                    if (error) {
                        return callback && callback(error);
                    }
                    createDir(path, callback, tryCount == undefined ? 2 : tryCount - 1);
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
export function ensureParentDir(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
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
                deleteDir(path, callback, tryCount == undefined ? 2 : tryCount - 1);
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
        let pending = entries.length;
        function done(error: NodeJS.ErrnoException) {
            if (error && !resultError) resultError = error;
            if (--pending > 0) return;
            if (resultError && tryCount !== 0) {
                return cleanDir(path, callback, tryCount == undefined ? 2 : tryCount - 1);
            }
            callback && callback(resultError);
        };
        for (const entry of entries) {
            const child = path + np.sep + entry;
            fs.stat(child, (error, stats) => {
                if (error) {
                    return done(error);
                }
                if (stats.isDirectory()) {
                    deleteDir(child, done);
                } else {
                    deleteFile(child, done);
                }
            });
        }
    });
}

/**
 * 如果父文件夹是空文件夹则异步删除。
 * @param path 要删除的文件路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function deleteParentDirIfEmpty(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    const dir = np.dirname(path);
    if (dir === path) {
        return callback && callback(null);
    }

    fs.rmdir(dir, error => {
        if (error) {
            switch (error.code) {
                case "ENOTEMPTY":
                case "ENOENT":
                case "EEXIST":
                case "EBUSY":
                    error = null;
                    break;
                default:
                    if (tryCount !== 0) {
                        return deleteParentDirIfEmpty(path, callback, tryCount == undefined ? 2 : tryCount - 1);
                    }
                    break;
            }
            return callback && callback(error);
        }
        deleteParentDirIfEmpty(dir, callback, tryCount);
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
                case "ENOENT":
                    return callback && callback(null, []);
                case "EMFILE":
                case "ENFILE":
                    return delay(getFiles, [path, callback, tryCount]);
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
 * 异步遍历指定的文件或文件夹。
 * @param path 要遍历的文件或文件夹路径。
 * @param options 遍历的选项。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function walk(path: string, options: WalkOptions, tryCount?: number) {
    path = np.resolve(path);
    const rootLength = path.length;
    let pending = 0;
    processFileOrDir(path);

    function processFileOrDir(path: string) {
        pending++;

        if (options.statsCache) {
            const cache = options.statsCache[path];
            if (cache) {
                if (Array.isArray(cache)) {
                    cache.push(statCallback);
                } else {
                    statCallback(path, null, cache);
                }
                return;
            }
            options.statsCache[path] = [statCallback];
        }

        fs.stat(path, (error, stats) => {
            if (options.statsCache) {
                const cache = <(typeof statCallback)[]>options.statsCache[path];
                options.statsCache[path] = stats;
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
            options.error && options.error(error);
        } else if (stats.isFile()) {
            options.file && options.file(path, stats);
        } else if (stats.isDirectory()) {
            if (path.length === rootLength || !options.dir || options.dir(path, stats) !== false) {
                processDir(path);
            }
        } else {
            options.other && options.other(path, stats);
        }
        if (--pending > 0) return;
        options.end && options.end();
    }

    function processDir(path: string) {
        pending++;

        if (options.entriesCache) {
            const cache = options.entriesCache[path];
            if (cache) {
                if (typeof cache[0] === "function") {
                    (<(typeof getFilesCallback)[]>cache).push(getFilesCallback);
                } else {
                    getFilesCallback(path, null, <string[]>cache);
                }
                return;
            }
            options.entriesCache[path] = [getFilesCallback];
        }

        getFiles(path, (error, entries) => {
            if (options.entriesCache) {
                const cache = <(typeof getFilesCallback)[]>options.entriesCache[path];
                options.entriesCache[path] = entries;
                for (const func of cache) {
                    func(path, error, entries);
                }
            } else {
                getFilesCallback(path, error, entries);
            }
        }, tryCount);

    }

    function getFilesCallback(path: string, error: NodeJS.ErrnoException, entries: string[]) {
        if (error) {
            options.error && options.error(error);
        } else {
            for (const entry of entries) {
                processFileOrDir(np.join(path, entry));
            }
        }
        if (--pending > 0) return;
        options.end && options.end();
    }

}

/**
 * 异步读取文件内容。
 * @param path 要读取的文件路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function readFile(path: string, callback?: (error: NodeJS.ErrnoException, buffer: Buffer) => void, tryCount?: number) {
    fs.readFile(path, (error, buffer) => {
        if (error) {
            if (tryCount === 0) {
                return callback && callback(error, null);
            }
            switch (error.code) {
                case "EMFILE":
                case "ENFILE":
                    return delay(readFile, [path, callback, tryCount]);
                default:
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
            if (tryCount === 0) {
                return callback && callback(error);
            }
            switch (error.code) {
                case "ENOENT":
                    return ensureParentDir(path, error => {
                        if (error) {
                            return callback && callback(error);
                        }
                        writeFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
                    });
                case "EMFILE":
                case "ENFILE":
                    return delay(writeFile, [path, data, callback, tryCount]);
                default:
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
            if (tryCount === 0) {
                return callback && callback(error);
            }
            switch (error.code) {
                case "ENOENT":
                    return ensureParentDir(path, error => {
                        if (error) {
                            return callback && callback(error);
                        }
                        appendFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
                    });
                case "EMFILE":
                case "ENFILE":
                    return delay(appendFile, [path, data, callback, tryCount]);
                default:
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
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    createDir(to, error => {
        if (error) {
            return callback && callback(error);
        }
        getFiles(from, (error, entries) => {
            if (error || !entries.length) {
                return callback && callback(error);
            }
            let resultError: NodeJS.ErrnoException = null;
            let pending = entries.length;
            function done(error: NodeJS.ErrnoException) {
                if (error && !resultError) resultError = error;
                if (--pending > 0) return;
                callback && callback(resultError);
            }
            for (const entry of entries) {
                const fromChild = np.join(from, entry);
                fs.stat(fromChild, (error, stats) => {
                    if (error) {
                        return done(error);
                    }
                    const toChild = np.join(to, entry);
                    if (stats.isDirectory()) {
                        copyDir(fromChild, toChild, done, tryCount);
                    } else {
                        copyFile(fromChild, toChild, done, tryCount);
                    }
                });
            }
        }, tryCount);
    }, tryCount);

}

/**
 * 异步复制指定的文件。
 * @param from 复制的源文件路径。
 * @param to 复制的目标文件路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function copyFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {

    let fdr: number;
    let fdw: number;

    open(from, true, tryCount);
    open(to, false, tryCount);

    function open(path: string, read: boolean, tryCount?: number) {
        fs.open(path, read ? 'r' : 'w', 0o666, (error, fd) => {
            if (error) {
                switch (error.code) {
                    case "EMFILE":
                    case "ENFILE":
                        return delay(open, [path, read, tryCount]);
                    case "ENOENT":
                        if (!read) {
                            return ensureParentDir(path, error => {
                                if (error) {
                                    return end(error);
                                }
                                open(path, read, tryCount);
                            }, tryCount);
                        }
                }
                if (tryCount === 0) {
                    return end(error);
                }
                return open(path, read, tryCount == undefined ? 2 : tryCount - 1);
            }

            if (read) {
                fdr = fd;
            } else {
                fdw = fd;
            }

            if (fdr !== undefined && fdw !== undefined) {
                copy(Buffer.allocUnsafe(64 * 1024), 0, tryCount);
            }

            resolve();
        });
    }

    function copy(buffer: Buffer, pos: number, tryCount?: number) {
        fs.read(fdr, buffer, 0, buffer.length, pos, (error, bytesRead, buffer) => {
            if (error) {
                if (tryCount === 0) {
                    return end(error);
                }
                return copy(buffer, pos, tryCount == undefined ? 2 : tryCount - 1);
            }
            if (bytesRead === 0) {
                return end(error);
            }
            fs.write(fdw, buffer, 0, bytesRead, (error, writen, buffer) => {
                if (error) {
                    if (tryCount === 0) {
                        return end(error);
                    }
                    return copy(buffer, pos, tryCount == undefined ? 2 : tryCount - 1);
                }
                if (writen < buffer.length) {
                    return end(error);
                }
                copy(buffer, pos + writen, tryCount);
            });
        });
    }

    function end(error: NodeJS.ErrnoException) {
        if (fdw != undefined) {
            fs.close(fdw, () => {
                fdw = undefined;
                if (fdr == undefined) {
                    callback && callback(error);
                }
            });
        }
        if (fdr != undefined) {
            fs.close(fdr, () => {
                fdr = undefined;
                if (fdw == undefined) {
                    callback && callback(error);
                }
            });
        }
    }

}

/**
 * 异步移动指定的文件夹。
 * @param from 移动的源文件夹路径。
 * @param to 移动的目标文件夹路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function moveDir(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    createDir(to, error => {
        if (error) {
            return callback && callback(error);
        }
        getFiles(from, (error, entries) => {
            if (error) {
                return callback && callback(error);
            }
            if (!entries.length) {
                return deleteDir(from, callback, tryCount);
            }
            let resultError: NodeJS.ErrnoException = null;
            let pending = entries.length;
            function done(error: NodeJS.ErrnoException) {
                if (error) resultError = error;
                if (--pending > 0) return;
                if (resultError) {
                    return callback && callback(resultError);
                }
                deleteDir(from, callback ? error => callback(resultError || error) : undefined, tryCount);
            }
            for (const entry of entries) {
                const fromChild = np.join(from, entry);
                fs.stat(fromChild, (error, stats) => {
                    if (error) {
                        return done(error);
                    }
                    const toChild = np.join(to, entry);
                    if (stats.isDirectory()) {
                        moveDir(fromChild, toChild, done, tryCount);
                    } else {
                        moveFile(fromChild, toChild, done, tryCount);
                    }
                });
            }
        }, tryCount);
    }, tryCount);
}

/**
 * 异步移动指定的文件。
 * @param from 移动的源文件路径。
 * @param to 移动的目标文件路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function moveFile(from: string, to: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    fs.rename(from, to, error => {
        if (error) {
            return copyFile(from, to, error => {
                if (error) {
                    return callback && callback(error);
                }
                deleteFile(from, callback, tryCount);
            }, tryCount);
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
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function getChecksum(path: string, comparion = FileComparion.default, callback?: (error: NodeJS.ErrnoException, result: string) => void, stats?: fs.Stats, buffer?: Buffer, tryCount?: number) {
    if ((comparion & (FileComparion.createTime | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.size)) && !stats) {
        return fs.stat(path, (error, stats) => {
            if (error) {
                return callback && callback(error, null);
            }
            getChecksum(path, comparion, callback, stats, buffer, tryCount);
        });
    }
    if ((comparion & (FileComparion.sha1 | FileComparion.md5 | FileComparion.data)) && !buffer) {
        return readFile(path, (error, buffer) => {
            if (error) {
                return callback && callback(error, null);
            }
            getChecksum(path, comparion, callback, stats, buffer, tryCount);
        }, tryCount);
    }
    callback && callback(null, getChecksumSync(path, comparion, stats, buffer, tryCount));
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
