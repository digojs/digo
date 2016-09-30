import "source-map-support/register";
import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as helper from "./io-helper";
import * as fs from "../../lib/utility/fs-sync";

describe('file system(sync)', () => {

    beforeEach(helper.createRootDir);
    afterEach(helper.cleanRootDir);

    it('getStatSync', () => {
        try {
            nfs.statSync(helper.root + "/non-exists");
            assert.ok(false);
        } catch (e) {
            assert.equal(e.code, "ENOENT");
        }
        assert.equal(fs.getStatSync(helper.newDir()).isDirectory(), true);
        assert.equal(fs.getStatSync(helper.newFile()).isFile(), true);
    });
    it('existsDirSync', () => {
        assert.equal(fs.existsDirSync(helper.root + "/non-exists"), false);
        assert.equal(fs.existsDirSync(helper.newDir()), true);
        assert.equal(fs.existsDirSync(helper.newFile()), false);
    });
    it('existsFileSync', () => {
        assert.equal(fs.existsFileSync(helper.root + "/non-exists"), false);
        assert.equal(fs.existsFileSync(helper.newDir()), false);
        assert.equal(fs.existsFileSync(helper.newFile()), true);
    });
    it('createDirSync', () => {
        fs.createDirSync(helper.root + "/foo/goo");
        assert.equal(nfs.existsSync(helper.root + "/foo/goo"), true);
        fs.createDirSync(helper.root + "/foo/goo");
        assert.equal(nfs.existsSync(helper.root + "/foo/goo"), true);
    });
    it('ensureParentDirSync', () => {
        fs.ensureParentDirSync(helper.root + "/foo/goo.txt");
        fs.ensureParentDirSync(helper.root + "/foo/goo.txt");
        assert.equal(nfs.existsSync(helper.root), true);
    });
    it('deleteDirSync', () => {
        const dir = helper.newNonEmptyDir();
        assert.equal(nfs.existsSync(dir), true);
        fs.deleteDirSync(dir);
        assert.equal(nfs.existsSync(dir), false);
        fs.deleteDirSync(dir);
    });
    it('cleanDirSync', () => {
        const dir = helper.newNonEmptyDir();
        assert.equal(fs.cleanDirSync(dir), null);
        assert.equal(nfs.existsSync(dir), true);
        assert.equal(nfs.existsSync(dir + "/1.txt"), false);
    });
    it('deleteParentDirIfEmptySync', () => {
        const dir = helper.newNonEmptyDir();
        fs.deleteParentDirIfEmptySync(dir + "/dir/sub-empty/1.txt");
        fs.deleteParentDirIfEmptySync(dir + "/dir/sub/1.txt");
        assert.equal(nfs.existsSync(dir + "/dir/sub"), true);

        nfs.unlinkSync(dir + "/dir/sub/1.txt");
        nfs.unlinkSync(dir + "/dir/sub/2.txt");
        fs.deleteParentDirIfEmptySync(dir + "/dir/sub/1.txt");
        assert.equal(nfs.existsSync(dir + "/dir/sub"), false);
    });
    it('deleteFileSync', () => {
        fs.deleteFileSync(helper.root + "/non-exists.txt");
        const file = helper.newFile();
        assert.equal(nfs.existsSync(file), true);
        fs.deleteFileSync(file);
        assert.equal(nfs.existsSync(file), false);
    });
    it('getFilesSync', () => {
        assert.deepEqual(fs.getFilesSync(helper.newNonEmptyDir()), ["1.txt", "2.txt", "dir"]);
    });
    it('walkDirSync', () => {
        const root = helper.newNonEmptyDir();
        const dirs = [];
        const files = [];
        fs.walkDirSync(root, {
            dir(path) {
                dirs.push(np.relative(root, path).replace(/\\/g, "/"));
            },
            file(path) {
                files.push(np.relative(root, path).replace(/\\/g, "/"));
            }
        });
        dirs.sort();
        files.sort();
        assert.deepEqual(dirs, ["dir", "dir/sub", "dir/sub-empty"]);
        assert.deepEqual(files, ["1.txt", "2.txt", "dir/sub/1.txt", "dir/sub/2.txt"]);
    });
    it('readFileSync', () => {
        const file = helper.newFile();
        assert.equal(fs.readFileSync(file).toString(), file);
    });
    it('writeFileSync', () => {
        fs.writeFileSync(helper.root + "/foo/a.txt", "A");
        assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "A");
        fs.writeFileSync(helper.root + "/foo/a.txt", "B");
        assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "B");
    });
    it('appendFileSync', () => {
        fs.appendFileSync(helper.root + "/foo/a.txt", "A");
        assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "A");
        fs.appendFileSync(helper.root + "/foo/a.txt", "B");
        assert.equal(nfs.readFileSync(helper.root + "/foo/a.txt"), "AB");
    });
    it('copyDirSync', () => {
        fs.copyDirSync(helper.newNonEmptyDir(), helper.root + "/copydir");
        assert.equal(nfs.existsSync(helper.root + "/copydir/dir/sub-empty"), true);
        assert.equal(nfs.readFileSync(helper.root + "/copydir/dir/sub/1.txt"), "/dir/sub/1.txt");
        assert.equal(nfs.readFileSync(helper.root + "/copydir/dir/sub/2.txt"), "/dir/sub/2.txt");
        assert.equal(nfs.readFileSync(helper.root + "/copydir/1.txt"), "/1.txt");
        assert.equal(nfs.readFileSync(helper.root + "/copydir/2.txt"), "/2.txt");
    });
    it('copyFileSync', () => {
        const file = helper.newFile();
        fs.copyFileSync(file, helper.root + "/goo/copyfile.txt");
        assert.equal(nfs.readFileSync(helper.root + "/goo/copyfile.txt").toString(), file);
    });
    it('moveDirSync', () => {
        const dir = helper.newNonEmptyDir();
        fs.moveDirSync(dir, helper.root + "/movedir");
        assert.equal(nfs.existsSync(dir), false);
        assert.equal(nfs.existsSync(helper.root + "/movedir/dir/sub-empty"), true);
        assert.equal(nfs.readFileSync(helper.root + "/movedir/dir/sub/1.txt"), "/dir/sub/1.txt");
        assert.equal(nfs.readFileSync(helper.root + "/movedir/dir/sub/2.txt"), "/dir/sub/2.txt");
        assert.equal(nfs.readFileSync(helper.root + "/movedir/1.txt"), "/1.txt");
        assert.equal(nfs.readFileSync(helper.root + "/movedir/2.txt"), "/2.txt");
    });
    it('moveFileSync', () => {
        const file = helper.newFile();
        fs.moveFileSync(file, helper.root + "/goo/movefile.txt");
        assert.equal(nfs.existsSync(file), false);
        assert.equal(nfs.readFileSync(helper.root + "/goo/movefile.txt").toString(), file);
    });
    it('getChecksumSync', () => {
        const file = helper.newFile();
        assert.equal(fs.getChecksumSync(file), fs.getChecksumSync(file));
    });
});
