/**
 * @fileOverview IO 测试时使用的工具函数
 * @author xuld <xuld@vip.qq.com>
 */
import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";

/**
 * 获取当前工作目录。
 */
export const cwd = process.cwd();

/**
 * 获取用于测试的根文件夹。
 */
export const root = np.join(cwd, "_fs-test-fixtures");

/**
 * 表示文件夹项。
 */
export interface DirEntries {
    [path: string]: string | DirEntries;
}

/**
 * 初始化辅助函数。
 */
export function init(entries?: DirEntries) {
    remove(root);
    nfs.mkdirSync(root);
    process.chdir(root);
    create(entries);
}

/**
 * 还原状态。
 */
export function uninit() {
    process.chdir(cwd);
    remove(root);
}

/**
 * 删除文件或文件夹。
 * @param path 要删除的文件或文件夹。
 */
export function remove(path) {
    try {
        nfs.readdirSync(path).forEach(name => remove(np.join(path, name)));
        nfs.rmdirSync(path);
    } catch (e) { }
    try {
        nfs.unlinkSync(path);
    } catch (e) { }
    if (nfs.existsSync(path)) {
        remove(path);
    }
}

/**
 * 创建文件和文件夹项。
 * @param entries 文件夹项。
 */
export function create(entries: DirEntries, dir?: string) {
    for (const key in entries) {
        const child = dir ? np.join(dir, key) : key;
        if (typeof entries[key] === "string") {
            while (true) {
                try {
                    nfs.writeFileSync(child, entries[key]);
                    break;
                } catch (e) { }
            }
        } else {
            while (true) {
                try {
                    nfs.mkdirSync(child);
                    break;
                } catch (e) { }
            }
            create(<DirEntries>entries[key], child);
        }
    }
}

/**
 * 判断当前文件是否包含指定的项。
 * @param entries 文件夹项。
 */
export function check(entries: DirEntries, dir?: string) {
    for (const key in entries) {
        const child = dir ? np.join(dir, key) : key;
        if (typeof entries[key] === "string") {
            assert.equal(nfs.readFileSync(child, entries), entries[key]);
        } else {
            try {
                assert.ok(nfs.statSync(child).isDirectory());
            } catch (e) {
                assert.ok(false, child);
            }
            check(<DirEntries>entries[key], child);
        }
    }
}

let fsBackup;

/**
 * 模拟 IO 错误。
 * @param code 模拟的错误码。
 * @param time 模拟的错误次数。
 */
export function simulateIOErrors(time = 2, codes = ["EMFILE", "ENOENV"]) {
    if (!fsBackup) {
        fsBackup = {};
        const funcs = [
            'access',
            'accessSync',
            'readFile',
            'readFileSync',
            'close',
            'closeSync',
            'open',
            'openSync',
            'read',
            'readSync',
            'write',
            'writeSync',
            'rename',
            'renameSync',
            'truncate',
            'truncateSync',
            'ftruncate',
            'ftruncateSync',
            'rmdir',
            'rmdirSync',
            'fdatasync',
            'fdatasyncSync',
            'fsync',
            'fsyncSync',
            'mkdir',
            'mkdirSync',
            'readdir',
            'readdirSync',
            'fstat',
            'lstat',
            'stat',
            'fstatSync',
            'lstatSync',
            'statSync',
            'readlink',
            'readlinkSync',
            'symlink',
            'symlinkSync',
            'link',
            'linkSync',
            'unlink',
            'unlinkSync',
            'fchmod',
            'fchmodSync',
            'chmod',
            'chmodSync',
            'fchown',
            'fchownSync',
            'chown',
            'chownSync',
            'utimes',
            'utimesSync',
            'futimes',
            'futimesSync',
            'writeFile',
            'writeFileSync',
            'appendFile',
            'appendFileSync',
            'realpathSync',
            'realpath',
            'mkdtemp',
            'mkdtempSync'
        ];
        for (const key of funcs) {
            fsBackup[key] = nfs[key];
        }
    }

    const errorCount = {};

    for (const key in fsBackup) {
        nfs[key] = function (path) {
            const id = `${key}:${path}`;
            if ((errorCount[id] || 0) >= time) {
                return fsBackup[key].apply(this, arguments);
            }
            errorCount[id] = errorCount[id] + 1 || 1;
            const error = <NodeJS.ErrnoException>new Error("Simulate IO Errors");
            error.code = codes[errorCount[id] - 1] || "UNKNOWN";
            if (typeof arguments[arguments.length - 1] === "function") {
                arguments[arguments.length - 1](error);
            } else {
                throw error;
            }
        };
    }

}

/**
 * 还原模拟 IO 错误。
 */
export function restoreIOErrors() {
    for (const key in fsBackup) {
        nfs[key] = fsBackup[key];
    }
}
