/**
 * @fileOverview 文件系统(异步)
 * @author xuld <xuld@vip.qq.com>
 */
import * as np from "path";
import * as nfs from "fs";
import { Stats, WalkOptions, FileComparion, getChecksumSync } from "./fsSync";

/**
 * 异步获取文件属性。
 * @param path 要获取的路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function getStat(path: string, callback?: (error: NodeJS.ErrnoException, stats: nfs.Stats) => void, tryCount?: number) {
    nfs.stat(path, (error, stats) => {
        if (error && error.code !== "ENOENT" && tryCount !== 0) {
            setTimeout(getStat, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
        } else {
            callback && callback(error, stats);
        }
    });
}

/**
 * 异步判断是否存在指定的文件夹。
 * @param path 要判断的路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function existsDir(path: string, callback?: (result: boolean) => void, tryCount?: number) {
    getStat(path, callback ? (error, stats) => callback(error ? false : stats.isDirectory()) : undefined, tryCount);
}

/**
 * 异步判断是否存在指定的文件。
 * @param path 要判断的路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function existsFile(path: string, callback?: (result: boolean) => void, tryCount?: number) {
    getStat(path, callback ? (error, stats) => callback(error ? false : stats.isFile()) : undefined, tryCount);
}

/**
 * 异步创建指定的文件夹。
 * @param path 要创建的文件夹路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function createDir(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    nfs.mkdir(path, 0o777 & ~process.umask(), error => {
        if (error) {
            if (error.code === "EEXIST") {
                callback && existsDir(path, result => callback(result ? null : error));
            } else if (tryCount === 0) {
                callback && callback(error);
            } else if (error.code === "ENOENT") {
                // NOTE: Win32: 如果路径中含非法字符，可能也会导致 ENOENT。
                // http://stackoverflow.com/questions/62771/how-do-i-check-if-a-given-string-is-a-legal-valid-file-name-under-windows/62888#62888
                ensureParentDir(path, error => createDir(path, callback, tryCount == undefined ? 2 : tryCount - 1), 0);
            } else {
                setTimeout(createDir, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
            }
        } else {
            callback && callback(error);
        }
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
    nfs.rmdir(path, error => {
        if (!error || error.code === "ENOENT") {
            callback && callback(null);
        } else if (error.code === "ENOTDIR" || tryCount === 0) {
            callback && callback(error);
        } else if (error.code === "ENOTEMPTY" || error.code === "EEXIST") {
            cleanDir(path, () => deleteDir(path, callback, tryCount == undefined ? 2 : tryCount - 1), 0);
        } else {
            setTimeout(deleteDir, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
        }
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
            callback && callback(error);
        } else {
            let pending = entries.length;
            const done = (e?: NodeJS.ErrnoException) => {
                if (e && !error) error = e;
                if (--pending <= 0) {
                    if (!error || tryCount === 0) {
                        callback && callback(error);
                    } else {
                        setTimeout(cleanDir, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
                    }
                }
            };
            for (const entry of entries) {
                const child = np.join(path, entry);
                nfs.lstat(child, (error, stats) => {
                    if (error) {
                        done(error);
                    } else if (stats.isDirectory()) {
                        deleteDir(child, done, 0);
                    } else {
                        deleteFile(child, done, 0);
                    }
                });
            }
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
    const parent = np.dirname(path);
    if (parent === path) {
        callback && callback(null);
    } else {
        nfs.rmdir(parent, error => {
            if (error) {
                switch (error.code) {
                    case "ENOTEMPTY":
                    case "EEXIST":
                    case "ENOENT":
                        callback && callback(null);
                        break;
                    default:
                        if (tryCount === 0) {
                            callback && callback(error);
                        } else {
                            setTimeout(deleteParentDirIfEmpty, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
                        }
                        break;
                }
            } else {
                deleteParentDirIfEmpty(parent, callback, tryCount);
            }
        });
    }
}

/**
 * 异步删除指定的文件。
 * @param path 要删除的文件路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function deleteFile(path: string, callback?: (error: NodeJS.ErrnoException) => void, tryCount?: number) {
    nfs.unlink(path, error => {
        if (!error || error.code === "ENOENT") {
            callback && callback(null);
        } else if (error.code === "EISDIR" || tryCount === 0) {
            callback && callback(error);
        } else {
            setTimeout(deleteFile, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
        }
    });
}

/**
 * 异步读取文件夹内的所有项。
 * @param path 要读取的文件夹路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function getFiles(path: string, callback?: (error: NodeJS.ErrnoException, entries?: string[]) => void, tryCount?: number) {
    nfs.readdir(path, (error, entries) => {
        if (error) {
            switch (error.code) {
                case "ENOENT":
                    callback && callback(null, []);
                    resolve();
                    break;
                case "EMFILE":
                case "ENFILE":
                    delay(getFiles, [path, callback, tryCount]);
                    break;
                default:
                    if (tryCount === 0) {
                        callback && callback(error, null);
                        resolve();
                    } else {
                        setTimeout(getFiles, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
                    }
                    break;
            }
        } else {
            callback && callback(error, entries);
            resolve();
        }
    });
}

/**
 * 异步遍历指定的文件或文件夹。
 * @param path 要遍历的文件或文件夹路径。
 * @param options 遍历的选项。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function walk(path: string, options: WalkOptions, tryCount?: number) {
    let pending = 0;
    processFileOrDir(np.resolve(path));

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
            } else {
                options.statsCache[path] = [statCallback];
                nfs.stat(path, (error, stats) => {
                    const cache = <(typeof statCallback)[]>options.statsCache[path];
                    options.statsCache[path] = stats;
                    for (const func of cache) {
                        func(path, error, stats);
                    }
                });
            }
        } else {
            nfs.stat(path, (error, stats) => statCallback(path, error, stats));
        }
    }

    function statCallback(path: string, error: NodeJS.ErrnoException, stats: nfs.Stats) {
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
        if (--pending <= 0) options.end && options.end();
    }

    function processDir(path: string, stats: nfs.Stats) {
        pending++;
        if (options.entriesCache) {
            const cache = options.entriesCache[path];
            if (cache) {
                if (typeof cache[0] === "function") {
                    (<(typeof getFilesCallback)[]>cache).push(getFilesCallback);
                } else {
                    getFilesCallback(path, null, stats, <string[]>cache);
                }
            } else {
                options.entriesCache[path] = [getFilesCallback];
                getFiles(path, (error, entries) => {
                    const cache = <(typeof getFilesCallback)[]>options.entriesCache[path];
                    options.entriesCache[path] = entries;
                    for (const func of cache) {
                        func(path, error, stats, entries);
                    }
                }, tryCount);
            }
        } else {
            getFiles(path, (error, entries) => getFilesCallback(path, error, stats, entries), tryCount);
        }
    }

    function getFilesCallback(path: string, error: NodeJS.ErrnoException, stats: nfs.Stats, entries: string[]) {
        if (error) {
            options.error && options.error(error);
        } else {
            options.walk && options.walk(path, stats, entries);
            for (const entry of entries) {
                processFileOrDir(np.join(path, entry));
            }
        }
        if (--pending <= 0) options.end && options.end();
    }

}

/**
 * 异步读取文件内容。
 * @param path 要读取的文件路径。
 * @param callback 操作完成后的回调函数。
 * @param tryCount 操作失败后自动重试的次数，默认为 3。
 */
export function readFile(path: string, callback?: (error: NodeJS.ErrnoException, buffer?: Buffer) => void, tryCount?: number) {
    nfs.readFile(path, (error, buffer) => {
        if (error && error.code !== "EISDIR" && tryCount !== 0) {
            switch (error.code) {
                case "EMFILE":
                case "ENFILE":
                    delay(readFile, [path, callback, tryCount]);
                    break;
                default:
                    setTimeout(readFile, 7, path, callback, tryCount == undefined ? 2 : tryCount - 1);
                    break;
            }
        } else {
            callback && callback(error, buffer);
            resolve();
        }
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
    nfs.writeFile(path, data, error => {
        if (error && error.code !== "EISDIR" && tryCount !== 0) {
            switch (error.code) {
                case "ENOENT":
                    ensureParentDir(path, error => writeFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1), 0);
                    break;
                case "EMFILE":
                case "ENFILE":
                    delay(writeFile, [path, data, callback, tryCount]);
                    break;
                default:
                    setTimeout(writeFile, 7, path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
                    break;
            }
        } else {
            callback && callback(error);
            resolve();
        }
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
    nfs.appendFile(path, data, error => {
        if (error && error.code !== "EISDIR" && tryCount !== 0) {
            switch (error.code) {
                case "ENOENT":
                    ensureParentDir(path, error => appendFile(path, data, callback, tryCount == undefined ? 2 : tryCount - 1), 0);
                    break;
                case "EMFILE":
                case "ENFILE":
                    delay(appendFile, [path, data, callback, tryCount]);
                    break;
                default:
                    setTimeout(appendFile, 7, path, data, callback, tryCount == undefined ? 2 : tryCount - 1);
                    break;
            }
        } else {
            callback && callback(error);
            resolve();
        }
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
            callback && callback(error);
        } else {
            getFiles(from, (error, entries?) => {
                if (error || !entries.length) {
                    callback && callback(error);
                } else {
                    let pending = entries.length;
                    const done = (e?: NodeJS.ErrnoException) => {
                        if (e && !error) error = e;
                        if (--pending <= 0) callback && callback(error);
                    };
                    for (const entry of entries) {
                        const fromChild = np.join(from, entry);
                        nfs.lstat(fromChild, (error, stats) => {
                            if (error) {
                                done(error);
                            } else {
                                const toChild = np.join(to, entry);
                                if (stats.isDirectory()) {
                                    copyDir(fromChild, toChild, done, tryCount);
                                } else if (stats.isSymbolicLink()) {
                                    nfs.readlink(fromChild, (error, link) => {
                                        if (error) {
                                            done(error);
                                        } else {
                                            nfs.symlink(link, toChild, 'junction', done);
                                        }
                                    });
                                } else {
                                    copyFile(fromChild, toChild, done, tryCount);
                                }
                            }
                        });
                    }
                }
            }, tryCount);
        }
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
        nfs.open(path, read ? 'r' : 'w', 0o666, (error, fd) => {
            if (error) {
                switch (error.code) {
                    case "EMFILE":
                    case "ENFILE":
                        delay(open, [path, read, tryCount]);
                        break;
                    case "ENOENT":
                        if (!read) {
                            ensureParentDir(path, error => {
                                if (error) {
                                    end(error);
                                } else {
                                    open(path, read, tryCount);
                                }
                            }, tryCount);
                            break;
                        }
                    // 继续执行
                    default:
                        if (tryCount === 0) {
                            end(error);
                        } else {
                            setTimeout(open, 7, path, read, tryCount == undefined ? 2 : tryCount - 1);
                        }
                }
            } else {
                if (read) {
                    fdr = fd;
                } else {
                    fdw = fd;
                }
                if (fdr !== undefined && fdw !== undefined) {
                    copy(Buffer.allocUnsafe(64 * 1024), 0, tryCount);
                }
                resolve();
            }
        });
    }

    function copy(buffer: Buffer, pos: number, tryCount?: number) {
        nfs.read(fdr, buffer, 0, buffer.length, pos, (error, bytesRead, buffer) => {
            if (error) {
                if (tryCount === 0) {
                    end(error);
                } else {
                    setTimeout(copy, 7, buffer, pos, tryCount == undefined ? 2 : tryCount - 1);
                }
            } else if (bytesRead === 0) {
                end(error);
            } else {
                nfs.write(fdw, buffer, 0, bytesRead, (error, writen, buffer) => {
                    if (error) {
                        if (tryCount === 0) {
                            end(error);
                        } else {
                            setTimeout(copy, 7, buffer, pos, tryCount == undefined ? 2 : tryCount - 1);
                        }
                    } else if (writen < buffer.length) {
                        end(error);
                    } else {
                        copy(buffer, pos + writen, tryCount);
                    }
                });
            }
        });
    }

    function end(error: NodeJS.ErrnoException) {
        if (fdw != undefined) {
            nfs.close(fdw, () => {
                fdw = undefined;
                if (fdr == undefined) {
                    callback && callback(error);
                }
            });
        }
        if (fdr != undefined) {
            nfs.close(fdr, () => {
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
            callback && callback(error);
        } else {
            getFiles(from, (error, entries?) => {
                if (error || !entries.length) {
                    callback && callback(error);
                } else {
                    let pending = entries.length;
                    const done = (e?: NodeJS.ErrnoException) => {
                        if (e && !error) error = e;
                        if (--pending <= 0) {
                            deleteDir(from, (e?) => {
                                if (e && !error) error = e;
                                callback && callback(error);
                            }, tryCount);
                        }
                    };
                    for (const entry of entries) {
                        const fromChild = np.join(from, entry);
                        nfs.lstat(fromChild, (error, stats) => {
                            if (error) {
                                done(error);
                            } else {
                                const toChild = np.join(to, entry);
                                if (stats.isDirectory()) {
                                    moveDir(fromChild, toChild, done, tryCount);
                                } else if (stats.isSymbolicLink()) {
                                    nfs.readlink(fromChild, (error, link?) => {
                                        if (error) {
                                            done(error);
                                        } else {
                                            nfs.symlink(link, toChild, 'junction', (error) => {
                                                if (error) {
                                                    done(error);
                                                } else {
                                                    deleteFile(fromChild, done);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    moveFile(fromChild, toChild, done, tryCount);
                                }
                            }
                        });
                    }
                }
            }, tryCount);
        }
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
    nfs.rename(from, to, error => {
        if (error) {
            copyFile(from, to, error => {
                if (error) {
                    callback && callback(error);
                } else {
                    setTimeout(deleteFile, 7, from, callback, tryCount);
                }
            }, tryCount);
        } else {
            callback && callback(error);
        }
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
export function getChecksum(path: string, comparion = FileComparion.default, callback?: (error: NodeJS.ErrnoException, result?: string) => void, stats?: nfs.Stats, buffer?: Buffer, tryCount?: number) {
    if ((comparion & (FileComparion.createTime | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.size)) && !stats) {
        return getStat(path, (error, stats) => {
            if (error) {
                return callback && callback(error, null);
            }
            getChecksum(path, comparion, callback, stats, buffer, tryCount);
        }, tryCount);
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
        const head = delayed.next;
        if (head === delayed) {
            delayed = null;
        } else {
            delayed.next = head.next;
        }
        head.callee.apply(this, head);
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    }
}
