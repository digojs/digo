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
    restoreIOErrors();
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
}

/**
 * 创建文件和文件夹项。
 * @param entries 文件夹项。
 */
export function create(entries: DirEntries, dir?: string) {
    for (const key in entries) {
        const child = dir ? np.join(dir, key) : key;
        if (typeof entries[key] === "string") {
            nfs.writeFileSync(child, entries[key]);
        } else {
            nfs.mkdirSync(child);
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

const fsBackup = {};

/**
 * 模拟 IO 错误。
 * @param syscall 要模拟错误的系统调用。如果未提供则应用全部系统调用。
 * @param code 模拟的错误码。
 * @param time 模拟的错误次数。
 */
export function simulateIOErrors(syscall?: string, codes = ["UNKNOWN", "EMFILE"], time = 1) {
    if (!syscall) {
        const funcs = [
            'access',
            'accessSync',
            'readFile',
            'readFileSync',
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
            'writeFile',
            'writeFileSync',
            'appendFile',
            'appendFileSync',
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
            'realpathSync',
            'realpath',
            'mkdtemp',
            'mkdtempSync'
        ];
        for (const key of funcs) {
            if (typeof nfs[key] === "function") {
                simulateIOErrors(key, codes, time);
            }
        }
    } else {
        let count = 0;
        fsBackup[syscall] = fsBackup[syscall] || nfs[syscall];
        nfs[syscall] = function (path) {
            if (count >= time) {
                return fsBackup[syscall].apply(this, arguments);
            }
            count++;
            const error = <NodeJS.ErrnoException>new Error("Simulated IO Errors");
            error.code = codes && codes[count] || "UNKNOWN";
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
        delete fsBackup[key];
    }
}
