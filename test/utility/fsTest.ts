import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as fs from "../../lib/utility/fs";
import * as fsHelper from "../helper/fsHelper";
import * as funcHelper from "../helper/funcHelper";

export namespace fsTest {

    const setTimeoutBackup = global.setTimeout;
    const fsBackup: any = {};
    export function before() {
        global.setTimeout = (func, timeout, ...args) => setTimeoutBackup(func, 1, ...args);
        for (const key in fs) {
            if (key === "walk") {
                continue;
            }
            fsBackup[key] = (fs as any)[key];
            (fs as any)[key] = function () {
                let callbackIndex = arguments.length;
                while (--callbackIndex >= 0) {
                    if (typeof arguments[callbackIndex] === "function") {
                        break;
                    }
                }
                if (callbackIndex >= 0) {
                    return fsHelper.simulateIOErrors(done => {
                        const callback = arguments[callbackIndex];
                        arguments[callbackIndex] = function () {
                            done();
                            return callback.apply(this, arguments);
                        };
                        return fsBackup[key].apply(this, arguments);
                    });
                } else {
                    return fsHelper.simulateIOErrors(() => fsBackup[key].apply(this, arguments));
                }
            };
        }
    }

    export function after() {
        global.setTimeout = setTimeoutBackup;
        Object.assign(fs, fsBackup);
    }

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.uninit();
    }

    export function getStatTest(done: MochaDone) {
        fs.getStat("non-exists", e => {
            assert.equal(e && e.code, "ENOENT");
            fs.getStat("dir1", (error, stats) => {
                assert.ok(!error);
                assert.equal(stats.isDirectory(), true);
                fs.getStat("f1.txt", (error, stats) => {
                    assert.ok(!error);
                    assert.equal(stats.isFile(), true);
                    done();
                });
            });
        });
    }

    export function getStatSyncTest() {
        try {
            nfs.statSync("non-exists");
            assert.ok(false);
        } catch (e) {
            assert.equal(e.code, "ENOENT");
        }
        assert.equal(fs.getStat("dir1").isDirectory(), true);
        assert.equal(fs.getStat("f1.txt").isFile(), true);
    }

    export function getStatLinkTest(done: MochaDone) {
        fs.getStatLink("non-exists", e => {
            assert.equal(e && e.code, "ENOENT");
            fs.getStatLink("dir1", (error, stats) => {
                assert.ok(!error);
                assert.equal(stats.isDirectory(), true);
                fs.getStatLink("f1.txt", (error, stats) => {
                    assert.ok(!error);
                    assert.equal(stats.isFile(), true);
                    done();
                });
            });
        });
    }

    export function getStatLinkSyncTest() {
        try {
            nfs.statSync("non-exists");
            assert.ok(false);
        } catch (e) {
            assert.equal(e.code, "ENOENT");
        }
        assert.equal(fs.getStatLink("dir1").isDirectory(), true);
        assert.equal(fs.getStatLink("f1.txt").isFile(), true);
    }

    export function ensureNewPathTest(done: MochaDone) {
        fs.ensureNewPath("non-exists", result => {
            assert.equal(result, "non-exists");
            fs.ensureNewPath("dir1", result => {
                // TODO: check this
                // assert.equal(result, "dir1_1");
                fs.ensureNewPath("f1.txt", result => {
                    // assert.equal(result, "f1_1.txt");
                    done();
                });
            });
        });
    }

    export function ensureNewPathSyncTest() {
        assert.equal(fs.ensureNewPath("non-exists"), "non-exists");
        // TODO: check this
        // assert.equal(fs.ensureNewPath("dir1"), "dir1_1");
        // assert.equal(fs.ensureNewPath("f1.txt"), "f1_1.txt");
    }

    export function existsDirTest(done: MochaDone) {
        fs.existsDir("non-exists", result => {
            assert.equal(result, false);
            fs.existsDir("dir1", result => {
                assert.equal(result, true);
                fs.existsDir("f1.txt", result => {
                    assert.equal(result, false);
                    done();
                });
            });
        });
    }

    export function existsDirSyncTest() {
        assert.equal(fs.existsDir("non-exists"), false);
        assert.equal(fs.existsDir("dir1"), true);
        assert.equal(fs.existsDir("f1.txt"), false);
    }

    export function existsFileTest(done: MochaDone) {
        fs.existsFile("non-exists", result => {
            assert.equal(result, false);
            fs.existsFile("dir1", result => {
                assert.equal(result, false);
                fs.existsFile("f1.txt", result => {
                    assert.equal(result, true);
                    done();
                });
            });
        });
    }

    export function existsFileSyncTest() {
        assert.equal(fs.existsFile("non-exists"), false);
        assert.equal(fs.existsFile("dir1"), false);
        assert.equal(fs.existsFile("f1.txt"), true);
    }

    export function createDirTest(done: MochaDone) {
        fsHelper.simulateIOErrors(done2 => {
            fs.createDir("foo/goo", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync("foo/goo"), true);
                fs.createDir("foo/goo", error => {
                    assert.ok(!error);
                    assert.equal(nfs.existsSync("foo/goo"), true);
                    done2();
                    done();
                });
            });
        }, undefined, undefined, ["mkdir"]);
    }

    export function createDirSyncTest() {
        fs.createDir("foo/goo");
        assert.equal(nfs.existsSync("foo/goo"), true);
        fs.createDir("foo/goo");
        assert.equal(nfs.existsSync("foo/goo"), true);
    }

    export function ensureParentDirTest(done: MochaDone) {
        fs.ensureParentDir("foo/goo.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("foo"), true);
            assert.equal(nfs.existsSync("foo/goo.txt"), false);
            fs.ensureParentDir("foo/goo.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync("foo"), true);
                assert.equal(nfs.existsSync("foo/goo.txt"), false);
                done();
            });
        });
    }

    export function ensureParentDirSyncTest() {
        fs.ensureParentDir("foo/goo.txt");
        fs.ensureParentDir("foo/goo.txt");
        assert.equal(nfs.existsSync(fsHelper.root), true);
    }

    export function deleteDirTest(done: MochaDone) {
        assert.equal(nfs.existsSync("dir1"), true);
        fs.deleteDir("dir1", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir1"), false);
            fs.deleteDir("dir1", error => {
                assert.ok(!error);
                done();
            });
        }, 20);
    }

    export function deleteDirSyncTest() {
        assert.equal(nfs.existsSync("dir1"), true);
        fs.deleteDir("dir1");
        assert.equal(nfs.existsSync("dir1"), false);
        fs.deleteDir("dir1");
    }

    export function cleanDirTest(done: MochaDone) {
        fs.cleanDir("dir1", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir1"), true);
            assert.equal(nfs.existsSync("dir1/sub2"), false);
            fs.cleanDir("dir1/sub3", error => {
                assert.ok(!error);
                fs.cleanDir("dir1/non-exists", error => {
                    assert.ok(!error);
                    done();
                });
            });
        });
    }

    export function cleanDirSyncTest() {
        assert.equal(fs.cleanDir("dir1"), null);
        assert.equal(nfs.existsSync("dir1"), true);
        assert.equal(nfs.existsSync("dir1/sub2"), false);

        assert.equal(fs.cleanDir("dir1/sub3"), null);
        assert.equal(fs.cleanDir("dir1/non-exists"), null);
    }

    export function deleteParentDirIfEmptyTest(done: MochaDone) {
        fs.deleteParentDirIfEmpty("dir1/sub3/foo.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir1/sub3"), false);
            fs.deleteParentDirIfEmpty("dir1/sub1/foo.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync("dir1/sub1"), true);

                fsHelper.create({ "empty-dir": {} });
                fs.deleteParentDirIfEmpty("empty-dir/non-exists/foo.txt", error => {
                    assert.ok(!error);
                    assert.equal(nfs.existsSync("empty-dir"), true);
                    done();
                });
            });
        });
    }

    export function deleteParentDirIfEmptySyncTest() {
        fs.deleteParentDirIfEmpty("dir1/sub3/foo.txt");
        assert.equal(nfs.existsSync("dir1/sub3"), false);

        fs.deleteParentDirIfEmpty("dir1/sub1/foo.txt");
        assert.equal(nfs.existsSync("dir1/sub1"), true);

        fsHelper.create({ "empty-dir": {} });
        fs.deleteParentDirIfEmpty("empty-dir/non-exists/foo.txt");
        assert.equal(nfs.existsSync("empty-dir"), true);

    }

    export function deleteFileTest(done: MochaDone) {
        fs.deleteFile("non-exists.txt", error => {
            assert.ok(!error);
            const path = "f1.txt";
            assert.equal(nfs.existsSync(path), true);
            fs.deleteFile(path, error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(path), false);
                done();
            });
        });
    }

    export function deleteFileSyncTest() {
        fs.deleteFile("non-exists.txt");
        fs.deleteFile("f1.txt");
        assert.equal(nfs.existsSync("f1.txt"), false);
    }

    export function getFilesTest(done: MochaDone) {
        fs.readDir(fsHelper.root, (error, entries) => {
            assert.ok(!error);
            entries.sort();
            assert.deepEqual(entries, ["dir1", "dir2", "f1.txt", "f2.txt"]);
            done();
        });
    }

    export function getFilesSyncTest() {
        assert.deepEqual(fs.readDir(fsHelper.root), ["dir1", "dir2", "f1.txt", "f2.txt"]);
    }

    export function walkTest(done: MochaDone) {
        const dirs: string[] = [];
        const files: string[] = [];
        fs.walk(fsHelper.root, {
            other() {

            },
            error(e) {
                assert.ok(false);
            },
            dir(path) {
                dirs.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            file(path) {
                files.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            end() {
                dirs.sort();
                files.sort();
                assert.deepEqual(dirs, ["", "dir1", "dir1/sub1", "dir1/sub2", "dir1/sub3", "dir2"]);
                assert.deepEqual(files, ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt", "dir1/sub2/f5.txt", "f1.txt", "f2.txt"]);
                done();
            }
        });
    }

    export function walkCacheTest(done: MochaDone) {
        const files: string[] = [];
        var callbacks: fs.WalkOptions = {
            stats: {},
            entries: {},
            file(path) {
                files.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            end: funcHelper.skip(() => {
                files.sort();
                assert.deepEqual(files, [
                    "dir1/sub1/f3.txt",
                    "dir1/sub1/f3.txt",
                    "dir1/sub1/f4.txt",
                    "dir1/sub1/f4.txt",
                    "dir1/sub2/f5.txt",
                    "dir1/sub2/f5.txt",
                    "f1.txt",
                    "f1.txt",
                    "f2.txt",
                    "f2.txt"
                ]);
                done();
            }, 2)
        };
        fs.walk(fsHelper.root, callbacks);
        fs.walk(fsHelper.root, callbacks);
    }

    export function walkEmptyTest(done: MochaDone) {
        fs.walk("non-exists", {
            end() {
                done();
            }
        });
    }

    export function walkSyncTest() {
        const dirs: string[] = [];
        const files: string[] = [];
        let end = false;
        fs.walk(fsHelper.root, {
            other() {

            },
            error() {
                assert.ok(false);
            },
            dir(path) {
                dirs.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            file(path) {
                files.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
        });
        dirs.sort();
        files.sort();
        assert.deepEqual(dirs, ["", "dir1", "dir1/sub1", "dir1/sub2", "dir1/sub3", "dir2"]);
        assert.deepEqual(files, ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt", "dir1/sub2/f5.txt", "f1.txt", "f2.txt"]);
        end = true;
        assert.ok(end);

        fs.walk(fsHelper.root, {
            dir(path) {
                dirs.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            file(path) {
                files.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            stats: {},
            entries: {}
        });

        fs.walk("non-exists", {});
    }

    export function readFileTest(done: MochaDone) {
        fs.readFile("f1.txt", (error, data) => {
            assert.ok(!error);
            assert.equal(data.toString(), "f1.txt");
            done();
        });
    }

    export function readFileIfTest(done: MochaDone) {
        fs.readFileIf("f1.txt", (error, data) => {
            assert.ok(!error);
            assert.equal(data.toString(), "f1.txt");
            fs.readFileIf("non-exists", (error, data) => {
                assert.ok(!error);
                assert.equal(data.toString(), "");
                done();
            });
        });
    }

    export function readFileSyncTest() {
        assert.equal(fs.readFile("f1.txt").toString(), "f1.txt");
    }

    export function readFileIfSyncTest() {
        assert.equal(fs.readFileIf("f1.txt").toString(), "f1.txt");
        assert.equal(fs.readFileIf("non-exists").toString(), "");
    }

    export function writeFileTest(done: MochaDone) {
        fs.writeFile("foo/goo.txt", "A", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
            fs.writeFile("foo/goo.txt", "你好", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync("foo/goo.txt"), "你好");
                done();
            });
        });
    }

    export function writeFileSyncTest() {
        fs.writeFile("foo/goo.txt", "A");
        assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
        fs.writeFile("foo/goo.txt", "你好");
        assert.equal(nfs.readFileSync("foo/goo.txt"), "你好");
    }

    export function writeFileIfTest(done: MochaDone) {
        fs.writeFileIf("foo/goo.txt", "A", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
            fs.writeFileIf("dir1/sub1/f3.txt", "你好", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync("dir1/sub1/f3.txt"), "f3.txt");
                done();
            });
        });
    }

    export function writeFileIfSyncTest() {
        fs.writeFileIf("foo/goo.txt", "A");
        assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
        fs.writeFileIf("dir1/sub1/f3.txt", "你好");
        assert.equal(nfs.readFileSync("dir1/sub1/f3.txt"), "f3.txt");
    }

    export function appendFileTest(done: MochaDone) {
        fs.appendFile("foo/goo.txt", "A", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
            fs.appendFile("foo/goo.txt", "你好", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync("foo/goo.txt"), "A你好");
                done();
            });
        });
    }

    export function appendFileSyncTest() {
        fs.appendFile("foo/goo.txt", "A");
        assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
        fs.appendFile("foo/goo.txt", "你好");
        assert.equal(nfs.readFileSync("foo/goo.txt"), "A你好");
    }

    export function copyDirTest(done: MochaDone) {
        fs.copyDir("dir1", "foo/copydir", error => {
            assert.ok(!error);
            fsHelper.check({
                "sub1": {
                    "f3.txt": "f3.txt",
                    "f4.txt": "f4.txt"
                },
                "sub2": {
                    "f5.txt": "f5.txt"
                },
                "sub3": {

                }
            }, "foo/copydir");
            done();
        });
    }

    export function copyDirSyncTest() {
        fs.copyDir("dir1", "foo/copydir");
        fsHelper.check({
            "sub1": {
                "f3.txt": "f3.txt",
                "f4.txt": "f4.txt"
            },
            "sub2": {
                "f5.txt": "f5.txt"
            },
            "sub3": {

            }
        }, "foo/copydir");
    }

    export function copyFileTest(done: MochaDone) {
        fs.copyFile("f1.txt", "goo/copyf1.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync("goo/copyf1.txt").toString(), "f1.txt");
            done();
        });
    }

    export function copyFileSyncTest() {
        fs.copyFile("f1.txt", "foo/copyf1.txt");
        assert.equal(nfs.readFileSync("foo/copyf1.txt").toString(), "f1.txt");
    }

    export function copyFileIfTest(done: MochaDone) {
        fs.copyFileIf("f1.txt", "goo/copyf1.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync("goo/copyf1.txt").toString(), "f1.txt");
            fs.copyFileIf("f1.txt", "dir1/sub1/f3.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync("dir1/sub1/f3.txt"), "f3.txt");
                done();
            });
        });
    }

    export function copyFileIfSyncTest() {
        fs.copyFileIf("f1.txt", "foo/copyf1.txt");
        assert.equal(nfs.readFileSync("foo/copyf1.txt").toString(), "f1.txt");
        fs.copyFileIf("f1.txt", "dir1/sub1/f3.txt");
        assert.equal(nfs.readFileSync("dir1/sub1/f3.txt").toString(), "f3.txt");
    }

    export function moveDirTest(done: MochaDone) {
        fs.moveDir("dir1", "foo/movedir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir1"), false);
            fsHelper.check({
                "sub1": {
                    "f3.txt": "f3.txt",
                    "f4.txt": "f4.txt"
                },
                "sub2": {
                    "f5.txt": "f5.txt"
                },
                "sub3": {

                }
            }, "foo/movedir");
            done();
        });
    }

    export function moveDirSyncTest() {
        fs.moveDir("dir1", "foo/movedir");
        assert.equal(nfs.existsSync("dir1"), false);
        fsHelper.check({
            "sub1": {
                "f3.txt": "f3.txt",
                "f4.txt": "f4.txt"
            },
            "sub2": {
                "f5.txt": "f5.txt"
            },
            "sub3": {

            }
        }, "foo/movedir");
    }

    export function moveFileSyncTest() {
        fs.moveFile("f1.txt", "foo/movef1.txt");
        assert.equal(nfs.existsSync("f1.txt"), false);
        assert.equal(nfs.readFileSync("foo/movef1.txt").toString(), "f1.txt");
    }

    export function moveFileTest(done: MochaDone) {
        fs.moveFile("f1.txt", "foo/movef1.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("f1.txt"), false);
            assert.equal(nfs.readFileSync("foo/movef1.txt").toString(), "f1.txt");
            done();
        });
    }

    export function getChecksumTest(done: MochaDone) {
        fs.getChecksum("f1.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastWriteTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size, (error, result1) => {
            assert.ok(!error);
            fs.getChecksum("f1.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastWriteTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size, (error, result2) => {
                assert.ok(!error);
                assert.equal(result1, result2);
                done();
            });
        });
    }

    export function getChecksumSyncTest() {
        fs.getChecksum("f1.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastWriteTime | fs.FileComparion.lastAccessTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size | fs.FileComparion.lastChangeTime);
        assert.equal(fs.getChecksum("f1.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastWriteTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size), fs.getChecksum("f1.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastWriteTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size));
    }

    export function shouldOmitEMFiles(done: MochaDone) {
        fsHelper.simulateIOErrors(done2 => {
            const cb = funcHelper.skip(() => {
                done2();
                done();
            }, 2);
            fsBackup["readFile"]("f1.txt", cb);
            fsBackup["readFile"]("f2.txt", cb);
        }, ["EMFILE", "ENFILE"], 2, ["readFile"]);
    }

}
