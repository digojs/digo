import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as fsHelper from "./fsHelper";
import * as fs from "../../lib/utility/fsSync";

export namespace fsSyncTest {

    const backup = {};

    export function before() {
        for (const key in fs) {
            if (typeof fs[key] !== "function") continue;
            backup[key] = fs[key];
            fs[key] = function () {
                var result;
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

    export function getStatSyncTest() {
        try {
            nfs.statSync(fsHelper.root + "/non-exists");
            assert.ok(false);
        } catch (e) {
            assert.equal(e.code, "ENOENT");
        }
        assert.equal(fs.getStatSync(fsHelper.root + "/dir").isDirectory(), true);
        assert.equal(fs.getStatSync(fsHelper.root + "/file.txt").isFile(), true);
    }

    export function existsDirSyncTest() {
        assert.equal(fs.existsDirSync(fsHelper.root + "/non-exists"), false);
        assert.equal(fs.existsDirSync(fsHelper.root + "/dir"), true);
        assert.equal(fs.existsDirSync(fsHelper.root + "/file.txt"), false);
    }

    export function existsFileSyncTest() {
        assert.equal(fs.existsFileSync(fsHelper.root + "/non-exists"), false);
        assert.equal(fs.existsFileSync(fsHelper.root + "/dir"), false);
        assert.equal(fs.existsFileSync(fsHelper.root + "/file.txt"), true);
    }

    export function createDirSyncTest() {
        fs.createDirSync(fsHelper.root + "/foo/goo");
        assert.equal(nfs.existsSync(fsHelper.root + "/foo/goo"), true);
        fs.createDirSync(fsHelper.root + "/foo/goo");
        assert.equal(nfs.existsSync(fsHelper.root + "/foo/goo"), true);
    }

    export function ensureParentDirSyncTest() {
        fs.ensureParentDirSync(fsHelper.root + "/foo/goo.txt");
        fs.ensureParentDirSync(fsHelper.root + "/foo/goo.txt");
        assert.equal(nfs.existsSync(fsHelper.root), true);
    }

    export function deleteDirSyncTest() {
        assert.equal(nfs.existsSync(fsHelper.root + "/dir"), true);
        fs.deleteDirSync(fsHelper.root + "/dir");
        assert.equal(nfs.existsSync(fsHelper.root + "/dir"), false);
        fs.deleteDirSync(fsHelper.root + "/dir");
    }

    export function cleanDirSyncTest() {
        assert.equal(fs.cleanDirSync(fsHelper.root + "/dir"), null);
        assert.equal(nfs.existsSync(fsHelper.root + "/dir"), true);
        assert.equal(nfs.existsSync(fsHelper.root + "/dir/sub"), false);
    }

    export function deleteParentDirIfEmptySyncTest() {
        fs.deleteParentDirIfEmptySync(fsHelper.root + "/dir/sub-empty/foo.txt");
        assert.equal(nfs.existsSync(fsHelper.root + "/dir/sub-empty"), false);

        fs.deleteParentDirIfEmptySync(fsHelper.root + "/dir/sub/foo.txt");
        assert.equal(nfs.existsSync(fsHelper.root + "/dir/sub"), true);

        fsHelper.create({ "empty-dir": {} });
        fs.deleteParentDirIfEmptySync(fsHelper.root + "/empty-dir/non-exists/foo.txt");
        assert.equal(nfs.existsSync(fsHelper.root + "/empty-dir"), true);
    }

    export function deleteFileSyncTest() {
        fs.deleteFileSync(fsHelper.root + "/non-exists.txt");
        fs.deleteFileSync(fsHelper.root + "/file.txt");
        assert.equal(nfs.existsSync(fsHelper.root + "/file.txt"), false);
    }

    export function getFilesSyncTest() {
        assert.deepEqual(fs.getFilesSync(fsHelper.root), ["dir", "file.txt"]);
    }

    export function walkSyncTest() {
        const dirs = [];
        const files = [];
        let end = false;
        fs.walkSync(fsHelper.root, {
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
                end = true;
            }
        });
        assert.ok(end);

        fs.walkSync(fsHelper.root, {
            dir(path) {
                dirs.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            file(path) {
                files.push(np.relative(fsHelper.root, path).replace(/\\/g, "/"));
            },
            statsCache: {},
            entriesCache: {}
        });

        fs.walkSync(fsHelper.root + "/non-exists", {});
    }

    export function readFileSyncTest() {
        assert.equal(fs.readFileSync(fsHelper.root + "/file.txt").toString(), "file.txt");
    }

    export function writeFileSyncTest() {
        fs.writeFileSync(fsHelper.root + "/foo/goo.txt", "A");
        assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "A");
        fs.writeFileSync(fsHelper.root + "/foo/goo.txt", "你好");
        assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "你好");
    }

    export function appendFileSyncTest() {
        fs.appendFileSync(fsHelper.root + "/foo/goo.txt", "A");
        assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "A");
        fs.appendFileSync(fsHelper.root + "/foo/goo.txt", "你好");
        assert.equal(nfs.readFileSync(fsHelper.root + "/foo/goo.txt"), "A你好");
    }

    export function copyDirSyncTest() {
        fs.copyDirSync(fsHelper.root + "/dir", fsHelper.root + "/foo/copydir");
        fsHelper.check({
            "sub": {
                ".subfile": ".subfile"
            },
            "sub-empty": {}
        }, fsHelper.root + "/foo/copydir");
    }

    export function copyFileSyncTest() {
        fs.copyFileSync(fsHelper.root + "/file.txt", fsHelper.root + "/foo/copyfile.txt");
        assert.equal(nfs.readFileSync(fsHelper.root + "/foo/copyfile.txt").toString(), "file.txt");
    }

    export function moveDirSyncTest() {
        fs.moveDirSync(fsHelper.root + "/dir", fsHelper.root + "/foo/movedir");
        assert.equal(nfs.existsSync(fsHelper.root + "/dir"), false);
        fsHelper.check({
            "sub": {
                ".subfile": ".subfile"
            },
            "sub-empty": {}
        }, fsHelper.root + "/foo/movedir");
    }

    export function moveFileSyncTest() {
        fs.moveFileSync(fsHelper.root + "/file.txt", fsHelper.root + "/foo/movefile.txt");
        assert.equal(nfs.existsSync(fsHelper.root + "/file.txt"), false);
        assert.equal(nfs.readFileSync(fsHelper.root + "/foo/movefile.txt").toString(), "file.txt");
    }

    export function getChecksumSyncTest() {
        assert.equal(fs.getChecksumSync(fsHelper.root + "/file.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastAccessTime | fs.FileComparion.lastWriteTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size), fs.getChecksumSync(fsHelper.root + "/file.txt", fs.FileComparion.createTime | fs.FileComparion.data | fs.FileComparion.lastAccessTime | fs.FileComparion.lastWriteTime | fs.FileComparion.md5 | fs.FileComparion.sha1 | fs.FileComparion.size));
    }

    export function shouldThrowErrors() {
        for (var key in backup) {
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

}
