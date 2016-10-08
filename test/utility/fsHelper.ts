/**
 * @fileOverview IO 测试时使用的工具函数
 * @author xuld <xuld@vip.qq.com>
 */
import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";

/**
 * 获取用于测试的根文件夹。
 */
export const root = "_fs-test~";

/**
 * 初始化根文件夹。
 */
export function init() {
    try {
        clean();
        nfs.mkdirSync(root);
        create({
            "dir": {
                "sub": {
                    ".subfile": ".subfile"
                },
                "sub-empty": {}
            },
            "file.txt": "file.txt"
        });
    } catch (e) {
        init();
    }
}

/**
 * 清理根文件夹。
 */
export function clean(dir = root) {
    try {
        nfs.unlinkSync(dir);
    } catch (e) { }
    try {
        nfs.readdirSync(dir).forEach(name => {
            clean(dir + "/" + name);
        });
    } catch (e) { }
    try {
        nfs.rmdirSync(dir);
    } catch (e) { }
}

/**
 * 表示文件夹项。
 */
export interface DirEntries {
    [path: string]: string | DirEntries;
}

/**
 * 创建文件和文件夹项。
 * @param entries 文件夹项。
 * @param 返回根路径。
 */
export function create(entries: DirEntries, dir = root) {
    for (const key in entries) {
        const child = dir + "/" + key;
        if (typeof entries[key] === "string") {
            nfs.writeFileSync(child, entries[key]);
        } else {
            nfs.mkdirSync(child);
            create(<DirEntries>entries[key], child);
        }
    }
    return dir;
}

/**
 * 判断当前文件是否包含指定的项。
 * @param entries 文件夹项。
 */
export function check(entries: DirEntries, dir = root) {
    for (const key in entries) {
        const child = dir + "/" + key;
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

/**
 * 在模拟 IO 错误下执行函数。
 */
export function simulateIOErrors(func: Function, code = "UNKNOWN", time = 2) {
    const backup = {};
    for (const key in nfs) {
        if (typeof nfs[key] !== "function") continue;
        if (/^(?:exists|stat)/.test(key)) continue;
        backup[key] = nfs[key];
        nfs[key] = function () {
            if (--time <= 0) {
                return backup[key].apply(this, arguments);
            }
            const error = <NodeJS.ErrnoException>new Error("Simulate IO Errors");
            error.code = code;
            if (typeof arguments[arguments.length - 1] === "function") {
                arguments[arguments.length - 1](error);
            } else {
                throw error;
            }
        }
    }

    try {
        func();
    } finally {
        for (const key in backup) {
            nfs[key] = backup[key];
        }
    }

}
