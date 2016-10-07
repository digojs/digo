import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as fsHelper from "./fsHelper";
import { FileComparion } from "../../lib/utility/fsSync";
import * as fs from "../../lib/utility/fs";

export namespace fsTest {

    const backup = {};

    export function before() {
        for (const key in fs) {
            if (typeof fs[key] !== "function") continue;
            backup[key] = fs[key];
            fs[key] = function () {
                let result;
                fsHelper.simulateIOErrors(() => {
                    result = backup[key].apply(this, arguments);
                });
                return result;
            };
        }
    }

    export function after() {
        for (const key in backup) {
            fs[key] = backup[key];
        }
    }

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.clean();
    }

    export function getStatTest(done: MochaDone) {
        fs.getStat(fsHelper.root + "/non-exists", e => {
            assert.equal(e && e.code, "ENOENT");
            fs.getStat(fsHelper.root + "/dir", (error, stats) => {
                assert.ok(!error);
                assert.equal(stats.isDirectory(), true);
                fs.getStat(fsHelper.root + "/file.txt", (error, stats) => {
                    assert.ok(!error);
                    assert.equal(stats.isFile(), true);
                    done();
                });
            });
        });
    }

    export function existsDirTest(done: MochaDone) {
        fs.existsDir(fsHelper.root + "/non-exists", result => {
            assert.equal(result, false);
            fs.existsDir(fsHelper.root + "/dir", result => {
                assert.equal(result, true);
                fs.existsDir(fsHelper.root + "/file.txt", result => {
                    assert.equal(result, false);
                    done();
                });
            });
        });
    }

    export function existsFileTest(done: MochaDone) {
        fs.existsFile(fsHelper.root + "/non-exists", result => {
            assert.equal(result, false);
            fs.existsFile(fsHelper.root + "/dir", result => {
                assert.equal(result, false);
                fs.existsFile(fsHelper.root + "/file.txt", result => {
                    assert.equal(result, true);
                    done();
                });
            });
        });
    }

    export function createDirTest(done: MochaDone) {
        fs.createDir(fsHelper.root + "/foo/goo", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(fsHelper.root + "/foo/goo"), true);
            fs.createDir(fsHelper.root + "/foo/goo", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(fsHelper.root + "/foo/goo"), true);
                done();
            });
        });
    }

    export function ensureParentDirTest(done: MochaDone) {
        fs.ensureParentDir(fsHelper.root + "/foo/goo.txt", error => {
            assert.ok(!error);
            fs.ensureParentDir(fsHelper.root + "/foo/goo.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(fsHelper.root), true);
                done();
            });
        });
    }

    export function deleteDirTest(done: MochaDone) {
        assert.equal(nfs.existsSync(fsHelper.root + "/dir"), true);
        fs.deleteDir(fsHelper.root + "/dir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(fsHelper.root + "/dir"), false);
            fs.deleteDir(fsHelper.root + "/dir", error => {
                assert.ok(!error);
                done();
            });
        });
    }

    export function cleanDirTest(done: MochaDone) {
        fs.cleanDir(fsHelper.root + "/dir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(fsHelper.root + "/dir"), true);
            assert.equal(nfs.existsSync(fsHelper.root + "/dir/sub"), false);
            done();
        });
    }

    export function deleteParentDirIfEmptyTest(done: MochaDone) {
        fs.deleteParentDirIfEmpty(fsHelper.root + "/dir/sub-empty/foo.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(fsHelper.root + "/dir/sub-empty"), false);
            fs.deleteParentDirIfEmpty(fsHelper.root + "/dir/sub/foo.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(fsHelper.root + "/dir/sub"), true);

                fsHelper.create({ "empty-dir": {} });
                fs.deleteParentDirIfEmpty(fsHelper.root + "/empty-dir/non-exists/foo.txt", error => {
                    assert.ok(!error);
                    assert.equal(nfs.existsSync(fsHelper.root + "/empty-dir"), true);
                    done();
                });
            });
        });
    }

    export function deleteFileTest(done: MochaDone) {
        fs.deleteFile(fsHelper.root + "/non-exists.txt", error => {
            assert.ok(!error);
            const path = fsHelper.root + "/file.txt";
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
            error() {
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
                assert.deepEqual(dirs, ["dir", "dir/sub", "dir/sub-empty"]);
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
                        fs.walk(fsHelper.root + "/non-exists", {
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
        fs.readFile(fsHelper.root + "/file.txt", (error, data) => {
            assert.ok(!error);
            assert.equal(data.toString(), "file.txt");
            done();
        });
    }

    export function writeFileTest(done: MochaDone) {
        fs.writeFile(fsHelper.root + "/foo/goo.txt", "A", error => {
            assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "A");
            fs.writeFile(fsHelper.root + "/foo/goo.txt", "你好", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "你好");
                done();
            });
        });
    }

    export function appendFileTest(done: MochaDone) {
        fs.appendFile(fsHelper.root + "/foo/goo.txt", "A", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "A");
            fs.appendFile(fsHelper.root + "/foo/goo.txt", "你好", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "A你好");
                done();
            });
        });
    }

    export function copyDirTest(done: MochaDone) {
        fs.copyDir(fsHelper.root + "/dir", fsHelper.root + "/foo/copydir", error => {
            assert.ok(!error);
            fsHelper.check({
                "sub": {
                    ".subfile": ".subfile"
                },
                "sub-empty": {}
            }, fsHelper.root + "/foo/copydir");
            done();
        });
    }

    export function copyFileTest(done: MochaDone) {
        fs.copyFile(fsHelper.root + "/file.txt", fsHelper.root + "/goo/copyfile.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync(fsHelper.root + "/goo/copyfile.txt").toString(), "file.txt");
            done();
        });
    }

    export function moveDirTest(done: MochaDone) {
        fs.moveDir(fsHelper.root + "/dir", fsHelper.root + "/foo/movedir", error => {
            assert.ok(!error);
            fsHelper.check({
                "sub": {
                    ".subfile": ".subfile"
                },
                "sub-empty": {}
            }, fsHelper.root + "/foo/movedir");
            done();
        });
    }

    export function moveFileTest(done: MochaDone) {
        fs.moveFile(fsHelper.root + "/file.txt", fsHelper.root + "/foo/movefile.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(fsHelper.root + "/file.txt"), false);
            assert.equal(nfs.readFileSync(fsHelper.root + "/foo/movefile.txt").toString(), "file.txt");
            done();
        });
    }

    export function getChecksumTest(done: MochaDone) {
        fs.getChecksum(fsHelper.root + "/file.txt", FileComparion.createTime | FileComparion.data | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.md5 | FileComparion.sha1 | FileComparion.size, (error, result1) => {
            assert.ok(!error);
            fs.getChecksum(fsHelper.root + "/file.txt", FileComparion.createTime | FileComparion.data | FileComparion.lastAccessTime | FileComparion.lastWriteTime | FileComparion.md5 | FileComparion.sha1 | FileComparion.size, (error, result2) => {
                assert.ok(!error);
                assert.equal(result1, result2);
                done();
            });
        });
    }

    export function shouldThrowErrors() {
        for (const key in backup) {
            try {
                fsHelper.simulateIOErrors(() => {
                    backup[key](".", 0, 0, 0, 0);
                }, "EEXIST", 1000);
                assert.ok(false);
            } catch (e) {

            }

            try {
                fsHelper.simulateIOErrors(() => {
                    backup[key](".", 0, 0, 0, 0);
                }, "ENOENT", 1000);
                assert.ok(false);
            } catch (e) {

            }
        }
    }

    export function shouldOmitEMFiles(done: MochaDone) {
        fsHelper.simulateIOErrors(() => {
            done = times(done, 4);
            readFileTest(done);
            getFilesTest(done);
            writeFileTest(done);
            copyFileTest(done);
        }, "EMFILE", 8);
    }

    function times(func: Function, times: number) {
        return function () {
            if (--times > 0) return;
            return func.apply(this, arguments);
        };
    }

}
