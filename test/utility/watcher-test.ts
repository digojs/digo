import "source-map-support/register";
import * as assert from "assert";
import * as nfs from "fs";
import * as path from "path";
import * as helper from "./io-helper";
import * as watcher from "../../lib/utility/watcher";

describe("watcher", () => {

    beforeEach(helper.createRootDir);
    afterEach(helper.cleanRootDir);

    it("add(dir, change file)", done => {
        let c = 0;
        new watcher.FSWatcher({
            onChange(name) {
                c++;
                assert.ok(c <= 2);
                assert.equal(name, path.basename(helper.root) + "/foo/你好.txt");
                if (c === 1) {
                    assert.equal(nfs.readFileSync(helper.root + "/foo/你好.txt"), "A");
                    nfs.writeFileSync(helper.root + "/foo/你好.txt", "B");
                }
                if (c === 2) {
                    assert.equal(nfs.readFileSync(helper.root + "/foo/你好.txt"), "B");
                    this.close();
                    done();
                }
            },
            delay: 20
        }).add(helper.root, () => {
            nfs.mkdirSync(helper.root + "/foo/");
            nfs.writeFileSync(helper.root + "/foo/你好.txt", "A");
        });
    });

    it("add(dir, delete file)", done => {
        nfs.mkdirSync(helper.root + "/foo/");
        nfs.writeFileSync(helper.root + "/foo/你好.txt", "A");
        new watcher.FSWatcher({
            onDelete(name) {
                assert.equal(name, path.basename(helper.root) + "/foo/你好.txt");
                assert.equal(nfs.existsSync(helper.root + "/foo/你好.txt"), false);
                this.close();
                done();
            },
            delay: 20
        }).add(helper.root, () => {
            nfs.unlinkSync(helper.root + "/foo/你好.txt");
        });
    });

    it("add(dir, change dir)", done => {
        const w = new watcher.FSWatcher({
            onChange(name) {
                assert.ok(false);
            },
            delay: 20
        });
        w.add(helper.root, () => {
            nfs.mkdirSync(helper.root + "/foo/");
            nfs.mkdirSync(helper.root + "/foo/goo");
            setTimeout(() => {
                w.close();
                done();
            }, 60);
        });
    });

    it("add(file, change file)", done => {
        nfs.mkdirSync(helper.root + "/foo/");
        nfs.writeFileSync(helper.root + "/foo/你好.txt", "");
        let c = 0;
        new watcher.FSWatcher({
            onChange(name) {
                c++;
                assert.ok(c <= 2);
                assert.equal(name, path.basename(helper.root) + "/foo/你好.txt");
                if (c === 1) {
                    assert.equal(nfs.readFileSync(helper.root + "/foo/你好.txt"), "A");
                    nfs.writeFileSync(helper.root + "/foo/你好.txt", "B");
                }
                if (c === 2) {
                    assert.equal(nfs.readFileSync(helper.root + "/foo/你好.txt"), "B");
                    this.close();
                    done();
                }
            },
            delay: 20
        }).add(helper.root + "/foo/你好.txt", () => {
            nfs.writeFileSync(helper.root + "/foo/你好.txt", "A");
        });
    });

    it("add(file, delete file)", done => {
        nfs.mkdirSync(helper.root + "/foo/");
        nfs.writeFileSync(helper.root + "/foo/你好.txt", "A");
        new watcher.FSWatcher({
            onDelete(name) {
                assert.equal(name, path.basename(helper.root) + "/foo/你好.txt");
                assert.equal(nfs.existsSync(helper.root + "/foo/你好.txt"), false);
                nfs.writeFileSync(helper.root + "/foo/你好.txt", "B");
                this.close();
                done();
            },
            onChange(name) {
                assert.ok(false);
            },
            delay: 20
        }).add(helper.root + "/foo/你好.txt", () => {
            nfs.unlinkSync(helper.root + "/foo/你好.txt");
        });
    });

    it("remove", () => {
        const w = new watcher.FSWatcher();
        w.add(".");
        w.remove(".");
        assert.equal(w.isWatching, false);
        w.close();
    });

});
