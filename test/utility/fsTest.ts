import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as fsHelper from "../helper/fsHelper";
import { FileComparion } from "../../lib/utility/fsSync";
import * as fs from "../../lib/utility/fs";

export namespace fsTest {

    const setTimeoutBackup = global.setTimeout;
    const fsBackup = {};
    export function before() {
        global.setTimeout = function (func, timeout, ...args) {
            func(...args);
            return null;
        };
        for (const key in fs) {
            fsBackup[key] = fs[key];
            fs[key] = function () {
                fsHelper.simulateIOErrors();
                for (var i = arguments.length - 1; i >= 0; i--) {
                    const callback = arguments[i];
                    if (typeof callback === "function") {
                        arguments[i] = function () {
                            fsHelper.restoreIOErrors();
                            return callback.apply(this, arguments);
                        };
                        break;
                    }
                }
                return fsBackup[key].apply(this, arguments);
            };
        }
    }

    export function after() {
        global.setTimeout = setTimeoutBackup;
        Object.assign(fs, fsBackup);
    }

    export function beforeEach() {
        fsHelper.init({
            "dir": {
                "sub": {
                    ".subfile": ".subfile"
                },
                "sub-empty": {}
            },
            "file.txt": "file.txt"
        });
    }

    export function afterEach() {
        fsHelper.uninit();
    }

    export function getStatTest(done: MochaDone) {
        fs.getStat("non-exists", e => {
            assert.equal(e && e.code, "ENOENT");
            fs.getStat("dir", (error, stats) => {
                assert.ok(!error);
                assert.equal(stats.isDirectory(), true);
                fs.getStat("file.txt", (error, stats) => {
                    assert.ok(!error);
                    assert.equal(stats.isFile(), true);
                    done();
                });
            });
        });
    }

    export function existsDirTest(done: MochaDone) {
        fs.existsDir("non-exists", result => {
            assert.equal(result, false);
            fs.existsDir("dir", result => {
                assert.equal(result, true);
                fs.existsDir("file.txt", result => {
                    assert.equal(result, false);
                    done();
                });
            });
        });
    }

    export function existsFileTest(done: MochaDone) {
        fs.existsFile("non-exists", result => {
            assert.equal(result, false);
            fs.existsFile("dir", result => {
                assert.equal(result, false);
                fs.existsFile("file.txt", result => {
                    assert.equal(result, true);
                    done();
                });
            });
        });
    }

    export function createDirTest(done: MochaDone) {
        fsHelper.simulateIOErrors("mkdir");
        fs.createDir("foo/goo", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("foo/goo"), true);
            fs.createDir("foo/goo", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync("foo/goo"), true);
                done();
            });
        });
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

    export function deleteDirTest(done: MochaDone) {
        assert.equal(nfs.existsSync("dir"), true);
        fs.deleteDir("dir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir"), false);
            fs.deleteDir("dir", error => {
                assert.ok(!error);
                done();
            });
        });
    }

    export function cleanDirTest(done: MochaDone) {
        fs.cleanDir("dir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir"), true);
            assert.equal(nfs.existsSync("dir/sub"), false);
            fs.cleanDir("dir/sub-empty", error => {
                assert.ok(!error);
                fs.cleanDir("dir/non-exists", error => {
                    assert.ok(!error);
                    done();
                });
            });
        });
    }

    export function deleteParentDirIfEmptyTest(done: MochaDone) {
        fs.deleteParentDirIfEmpty("dir/sub-empty/foo.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("dir/sub-empty"), false);
            fs.deleteParentDirIfEmpty("dir/sub/foo.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync("dir/sub"), true);

                fsHelper.create({ "empty-dir": {} });
                fs.deleteParentDirIfEmpty("empty-dir/non-exists/foo.txt", error => {
                    assert.ok(!error);
                    assert.equal(nfs.existsSync("empty-dir"), true);
                    fs.deleteParentDirIfEmpty("E:", error => {
                        assert.ok(!error);
                        done();
                    });
                });
            });
        });
    }

    export function deleteFileTest(done: MochaDone) {
        fs.deleteFile("non-exists.txt", error => {
            assert.ok(!error);
            const path = "file.txt";
            assert.equal(nfs.existsSync(path), true);
            fs.deleteFile(path, error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(path), false);
                done();
            });
        });
    }

    export function getFilesTest(done: MochaDone) {
        fs.getFiles(fsHelper.root, (error, entries) => {
            assert.ok(!error);
            assert.deepEqual(entries, ["dir", "file.txt"]);
            done();
        });
    }

    export function walkTest(done: MochaDone) {
        const dirs = [];
        const files = [];
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
                assert.deepEqual(dirs, ["", "dir", "dir/sub", "dir/sub-empty"]);
                assert.deepEqual(files, ["dir/sub/.subfile", "file.txt"]);

                const myFiles = [];

                var callbacks = {
                    statsCache: {},
                    entriesCache: {},
                    file(path) {
                        myFiles.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
                    },
                    end: times(() => {
                        myFiles.sort();
                        assert.deepEqual(myFiles, ["dir/sub/.subfile", "dir/sub/.subfile", "file.txt", "file.txt"]);
                        fs.walk("non-exists", {
                            end() {
                                done();
                            }
                        });
                    }, 2)
                };

                fs.walk(fsHelper.root, callbacks);
                fs.walk(fsHelper.root, callbacks);
            }
        });
    }

    export function readFileTest(done: MochaDone) {
        fs.readFile("file.txt", (error, data) => {
            assert.ok(!error);
            assert.equal(data.toString(), "file.txt");
            done();
        });
    }

    export function writeFileTest(done: MochaDone) {
        fs.writeFile("foo/goo.txt", "A", error => {
            assert.equal(nfs.readFileSync("foo/goo.txt"), "A");
            fs.writeFile("foo/goo.txt", "你好", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync("foo/goo.txt"), "你好");
                done();
            });
        });
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

    export function copyDirTest(done: MochaDone) {
        fs.copyDir("dir", "foo/copydir", error => {
            assert.ok(!error);
            fsHelper.check({
                "sub": {
                    ".subfile": ".subfile"
                },
                "sub-empty": {}
            }, "foo/copydir");
            done();
        });
    }

    export function copyFileTest(done: MochaDone) {
        fs.copyFile("file.txt", "goo/copyfile.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync("goo/copyfile.txt").toString(), "file.txt");
            done();
        });
    }

    export function moveDirTest(done: MochaDone) {
        fs.moveDir("dir", "foo/movedir", error => {
            assert.ok(!error);
            fsHelper.check({
                "sub": {
                    ".subfile": ".subfile"
                },
                "sub-empty": {}
            }, "foo/movedir");
            done();
        });
    }

    export function moveFileTest(done: MochaDone) {
        fs.moveFile("file.txt", "foo/movefile.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync("file.txt"), false);
            assert.equal(nfs.readFileSync("foo/movefile.txt").toString(), "file.txt");
            done();
        });
    }

    export function getChecksumTest(done: MochaDone) {
        fs.getChecksum("file.txt", FileComparion.createTime | FileComparion.data | FileComparion.lastWriteTime | FileComparion.md5 | FileComparion.sha1 | FileComparion.size, (error, result1) => {
            assert.ok(!error);
            fs.getChecksum("file.txt", FileComparion.createTime | FileComparion.data | FileComparion.lastWriteTime | FileComparion.md5 | FileComparion.sha1 | FileComparion.size, (error, result2) => {
                assert.ok(!error);
                assert.equal(result1, result2);
                done();
            });
        });
    }

    // export function shouldOmitEMFiles(done: MochaDone) {
    //     errorCode = "EMFILE";
    //     done = times(done, 4);
    //     readFileTest(done);
    //     getFilesTest(done);
    //     writeFileTest(done);
    //     copyFileTest(done);
    // }

    function times(func: Function, times: number) {
        return function () {
            if (--times > 0) return;
            return func.apply(this, arguments);
        };
    }

}
