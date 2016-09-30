import "source-map-support/register";
import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as helper from "./io-helper";
import * as fs from "../../lib/utility/fs";

describe('file system', () => {

    beforeEach(helper.createRootDir);
    afterEach(helper.cleanRootDir);

    it('getStat', done => {
        fs.getStat(helper.root + "/non-exists", e => {
            assert.equal(e && e.code, "ENOENT");
            fs.getStat(helper.newDir(), (error, stats) => {
                assert.ok(!error);
                assert.equal(stats.isDirectory(), true);
                fs.getStat(helper.newFile(), (error, stats) => {
                    assert.ok(!error);
                    assert.equal(stats.isFile(), true);
                    done();
                });
            });
        });
    });
    it('existsDir', done => {
        fs.existsDir(helper.root + "/non-exists", result => {
            assert.equal(result, false);
            fs.existsDir(helper.newDir(), result => {
                assert.equal(result, true);
                fs.existsDir(helper.newFile(), result => {
                    assert.equal(result, false);
                    done();
                });
            });
        });
    });
    it('existsFile', done => {
        fs.existsFile(helper.root + "/non-exists", result => {
            assert.equal(result, false);
            fs.existsFile(helper.newDir(), result => {
                assert.equal(result, false);
                fs.existsFile(helper.newFile(), result => {
                    assert.equal(result, true);
                    done();
                });
            });
        });
    });
    it('createDir', done => {
        fs.createDir(helper.root + "/foo/goo", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(helper.root + "/foo/goo"), true);
            fs.createDir(helper.root + "/foo/goo", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(helper.root + "/foo/goo"), true);
                done();
            });
        });
    });
    it('ensureParentDir', done => {
        fs.ensureParentDir(helper.root + "/foo/goo.txt", error => {
            assert.ok(!error);
            fs.ensureParentDir(helper.root + "/foo/goo.txt", error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(helper.root), true);
                done();
            });
        });
    });
    it('deleteDir', done => {
        const path = helper.newNonEmptyDir();
        assert.equal(nfs.existsSync(path), true);
        fs.deleteDir(path, error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(path), false);
            fs.deleteDir(path, error => {
                assert.ok(!error);
                done();
            });
        });
    });
    it('cleanDir', done => {
        const path = helper.newNonEmptyDir();
        fs.cleanDir(path, error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(path), true);
            assert.equal(nfs.existsSync(path + "/1.txt"), false);
            done();
        });
    });
    it('deleteParentDirIfEmpty', done => {
        const path = helper.newNonEmptyDir();
        fs.deleteParentDirIfEmpty(path + "/dir/sub-empty/1.txt", () => {
            fs.deleteParentDirIfEmpty(path + "/dir/sub/1.txt", () => {
                assert.equal(nfs.existsSync(path + "/dir/sub"), true);
                nfs.unlinkSync(path + "/dir/sub/1.txt");
                nfs.unlinkSync(path + "/dir/sub/2.txt");
                fs.deleteParentDirIfEmpty(path + "/dir/sub/1.txt", () => {
                    assert.equal(nfs.existsSync(path + "/dir/sub"), false);
                    done();
                });
            });
        });
    });
    it('deleteFile', done => {
        fs.deleteFile(helper.root + "/non-exists.txt", error => {
            assert.ok(!error);
            const path = helper.newFile();
            assert.equal(nfs.existsSync(path), true);
            fs.deleteFile(path, error => {
                assert.ok(!error);
                assert.equal(nfs.existsSync(path), false);
                done();
            });
        });
    });
    it('getFiles', done => {
        fs.getFiles(helper.newNonEmptyDir(), (error, entries) => {
            assert.ok(!error);
            assert.deepEqual(entries, ["1.txt", "2.txt", "dir"]);
            done();
        });
    });
    it('walkDir', done => {
        const root = helper.newNonEmptyDir();
        const dirs = [];
        const files = [];
        fs.walkDir(root, {
            dir(path) {
                dirs.push(np.relative(root, path).replace(/\\/g, "/"));
            },
            file(path) {
                files.push(np.relative(root, path).replace(/\\/g, "/"));
            },
            end() {
                dirs.sort();
                files.sort();
                assert.deepEqual(dirs, ["dir", "dir/sub", "dir/sub-empty"]);
                assert.deepEqual(files, ["1.txt", "2.txt", "dir/sub/1.txt", "dir/sub/2.txt"]);
                done();
            }
        });
    });
    it('readFile', done => {
        const file = helper.newFile();
        fs.readFile(file, (error, data) => {
            assert.ok(!error);
            assert.equal(data.toString(), file);
            done();
        });
    });
    it('writeFile', done => {
        fs.writeFile(helper.root + "/foo/a.txt", "A", error => {
            assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "A");
            fs.writeFile(helper.root + "/foo/a.txt", "B", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "B");
                done();
            });
        });
    });
    it('appendFile', done => {
        fs.appendFile(helper.root + "/foo/a.txt", "A", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "A");
            fs.appendFile(helper.root + "/foo/a.txt", "B", error => {
                assert.ok(!error);
                assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "AB");
                done();
            });
        });
    });
    it('copyDir', done => {
        fs.copyDir(helper.newNonEmptyDir(), helper.root + "/copydir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(helper.root + "/copydir/dir/sub-empty"), true);
            assert.equal(nfs.readFileSync(helper.root + "/copydir/dir/sub/1.txt"), "/dir/sub/1.txt");
            assert.equal(nfs.readFileSync(helper.root + "/copydir/dir/sub/2.txt"), "/dir/sub/2.txt");
            assert.equal(nfs.readFileSync(helper.root + "/copydir/1.txt"), "/1.txt");
            assert.equal(nfs.readFileSync(helper.root + "/copydir/2.txt"), "/2.txt");
            done();
        });
    });
    it('copyFile', done => {
        const file = helper.newFile();
        fs.copyFile(file, helper.root + "/goo/copyfile.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.readFileSync(helper.root + "/goo/copyfile.txt").toString(), file);
            done();
        });
    });
    it('moveDir', done => {
        const dir = helper.newNonEmptyDir();
        fs.moveDir(dir, helper.root + "/movedir", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(dir), false);
            assert.equal(nfs.existsSync(helper.root + "/movedir/dir/sub-empty"), true);
            assert.equal(nfs.readFileSync(helper.root + "/movedir/dir/sub/1.txt"), "/dir/sub/1.txt");
            assert.equal(nfs.readFileSync(helper.root + "/movedir/dir/sub/2.txt"), "/dir/sub/2.txt");
            assert.equal(nfs.readFileSync(helper.root + "/movedir/1.txt"), "/1.txt");
            assert.equal(nfs.readFileSync(helper.root + "/movedir/2.txt"), "/2.txt");
            done();
        });
    });
    it('moveFile', done => {
        const file = helper.newFile();
        fs.moveFile(file, helper.root + "/goo/movefile.txt", error => {
            assert.ok(!error);
            assert.equal(nfs.existsSync(file), false);
            assert.equal(nfs.readFileSync(helper.root + "/goo/movefile.txt").toString(), file);
            done();
        });
    });
    it('getChecksum', done => {
        const file = helper.newFile();
        fs.getChecksum(file, undefined, (error, result1) => {
            assert.ok(!error);
            fs.getChecksum(file, undefined, (error, result2) => {
                assert.ok(!error);
                assert.equal(result1, result2);
                done();
            });
        });
    });
});
