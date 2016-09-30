/**
 * @fileOverview IO 测试时使用的工具函数
 * @author xuld <xuld@vip.qq.com>
 */
import * as assert from "assert";
import * as nfs from "fs";
import * as path from "path";

/**
 * 获取用于测试的根文件夹。
 */
export var root = ".test~";

/**
 * 创建用于测试的根文件夹。
 */
export function createRootDir() {
    for (let i = ~~(Math.random() * 10000); nfs.existsSync(root = path.resolve(".test" + i + "~")); i++);
    nfs.mkdirSync(root);
}

/**
 * 删除用于测试的根文件夹。
 */
export function cleanRootDir() {
    while (true) {
        clean(root);
        try {
            nfs.statSync(root);
        } catch (e) {
            if (e.code === "ENOENT") {
                return;
            }
        }
    }
}

/**
 * 创建一个新的空文件夹。
 */
export function newDir() {
    try {
        nfs.mkdirSync(root);
    } catch (e) { }
    const path = root + "/" + Math.random() + "_dir";
    nfs.mkdirSync(path);
    return path;
}

/**
 * 创建一个新的非空文件夹。
 */
export function newNonEmptyDir() {
    const path = newDir();
    nfs.mkdirSync(path + "/dir");
    nfs.mkdirSync(path + "/dir/sub-empty");
    nfs.mkdirSync(path + "/dir/sub");
    nfs.writeFileSync(path + "/dir/sub/1.txt", "/dir/sub/1.txt");
    nfs.writeFileSync(path + "/dir/sub/2.txt", "/dir/sub/2.txt");
    nfs.writeFileSync(path + "/1.txt", "/1.txt");
    nfs.writeFileSync(path + "/2.txt", "/2.txt");
    try {
        nfs.symlinkSync(path + "/dir/sub/1.txt", path + "link");
    } catch (e) { }
    return path;
}

/**
 * 创建一个新的文件。
 */
export function newFile() {
    try {
        nfs.mkdirSync(root);
    } catch (e) { }
    const path = root + "/" + Math.random() + ".txt";
    nfs.writeFileSync(path, path);
    return path;
}

/**
 * 删除指定的文件或文件夹。
 */
export function clean(path: string) {
    try {
        nfs.unlinkSync(path);
    } catch (e) { }
    try {
        nfs.readdirSync(path).forEach(name => {
            clean(path + "/" + name);
        });
    } catch (e) { }
    try {
        nfs.rmdirSync(path);
    } catch (e) { }
}
