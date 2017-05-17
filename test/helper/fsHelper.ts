import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";

/**
 * 原始工作文件夹。
 */
export const cwd = process.cwd();

/**
 * 存放所有测试文件的根文件夹。
 */
export const root = np.join(cwd, "__test__");

/**
 * 表示一个文件项。
 */
export interface FileEntries {
    [path: string]: string | FileEntries;
}

/**
 * 创建新的测试文件和文件夹。
 * @param entries 要创建的文件和文件夹列表。
 */
export function init(entries: FileEntries = {
    "dir1": {
        "sub1": {
            "f3.txt": "f3.txt",
            "f4.txt": "f4.txt"
        },
        "sub2": {
            "f5.txt": "f5.txt"
        },
        "sub3": {}
    },
    "dir2": {},
    "f1.txt": "f1.txt",
    "f2.txt": "f2.txt"
}) {
    remove(root);
    nfs.mkdirSync(root);
    process.chdir(root);
    create(entries);
}

/**
 * 删除测试文件和文件夹。
 */
export function uninit() {
    process.chdir(cwd);
    remove(root);
}

/**
 * 删除指定的文件或文件夹。
 * @param path 要删除的文件或文件夹。
 */
export function remove(path: string) {
    try {
        nfs.readdirSync(path).forEach(name => remove(np.join(path, name)));
        nfs.rmdirSync(path);
    } catch (e) { }
    try {
        nfs.unlinkSync(path);
    } catch (e) { }
}

/**
 * 创建指定的文件项。
 * @param entries 要创建的文件项。
 * @param dir 根文件夹。
 */
export function create(entries: FileEntries, dir = process.cwd()) {
    for (const key in entries) {
        const entry = entries[key];
        const child = np.join(dir, key);
        if (typeof entry === "string") {
            nfs.writeFileSync(child, entry);
        } else {
            nfs.mkdirSync(child);
            create(entry, child);
        }
    }
}

/**
 * 校验指定文件项。
 * @param entries 要校验的文件项。
 * @param dir 根文件夹。
 */
export function check(entries: FileEntries, dir = process.cwd()) {
    for (const key in entries) {
        const entry = entries[key];
        const child = np.join(dir, key);
        if (typeof entry === "string") {
            assert.equal(nfs.readFileSync(child, entries), entry);
        } else {
            try {
                assert.ok(nfs.statSync(child).isDirectory());
            } catch (e) {
                assert.ifError(e);
            }
            check(entry, child);
        }
    }
}

/**
 * 在模拟 IO 错误状态下执行函数。
 * @param func 要执行的函数。
 * @param codes 模拟的错误码。
 * @param count 模拟的错误次数。
 * @param syscalls 要模拟错误的系统调用函数列表(如 "readFileSync")。
 * @return 返回原函数返回值。
 */
export function simulateIOErrors(func: (done: () => void) => void, codes = ["UNKNOWN", "EMFILE", "EBUSY"], count = 1, syscalls = ["access", "accessSync", "readFile", "readFileSync", "rename", "renameSync", "truncate", "truncateSync", "ftruncate", "ftruncateSync", "rmdir", "rmdirSync", "fdatasync", "fdatasyncSync", "fsync", "fsyncSync", "mkdir", "mkdirSync", "readdir", "readdirSync", "fstat", "lstat", "stat", "fstatSync", "lstatSync", "statSync", "readlink", "readlinkSync", "writeFile", "writeFileSync", "symlink", "symlinkSync", "link", "linkSync", "unlink", "unlinkSync", "fchmod", "fchmodSync", "chmod", "chmodSync", "fchown", "fchownSync", "chown", "chownSync", "utimes", "utimesSync", "futimes", "futimesSync", "realpathSync", "realpath", "mkdtemp", "mkdtempSync"]) {
    const fsBackup: any = {};
    for (const syscall of syscalls) {
        fsBackup[syscall] = (nfs as any)[syscall];
        let c = -1;
        (nfs as any)[syscall] = function () {
            if (++c < count) {
                const error = new Error("Simulated IO Errors") as NodeJS.ErrnoException;
                error.code = codes && codes[c] || "UNKNOWN";
                if (typeof arguments[arguments.length - 1] === "function") {
                    return arguments[arguments.length - 1](error);
                } else {
                    throw error;
                }
            }
            return fsBackup[syscall].apply(this, arguments);
        };
    }
    const restore = () => {
        for (const syscall in fsBackup) {
            (nfs as any)[syscall] = fsBackup[syscall];
        }
    };
    if (func.length <= 0) {
        try {
            return (func as Function)();
        } finally {
            restore();
        }
    } else {
        try {
            return func(restore);
        } catch (e) {
            restore();
            throw e;
        }
    }
}
