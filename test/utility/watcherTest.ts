import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as fsHelper from "../helper/fsHelper";
import * as watcher from "../../lib/utility/watcher";

export namespace watcherTest {

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.clean();
    }

    export function watchDirAndChangeFile(done: MochaDone) {
        let c = 0;
        new watcher.FSWatcher({
            onChange(path) {
                c++;
                assert.ok(c <= 2);
                assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
                if (c === 1) {
                    assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "A");
                    nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "B");
                }
                if (c === 2) {
                    assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "B");
                    this.close();
                    done();
                }
            },
            delay: 20
        }).add(fsHelper.root, () => {
            nfs.mkdirSync(fsHelper.root + "/foo/");
            nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        });
    }

    export function watchDirAndDeleteFile(done: MochaDone) {
        nfs.mkdirSync(fsHelper.root + "/foo/");
        nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        new watcher.FSWatcher({
            onDelete(path) {
                assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
                assert.equal(nfs.existsSync(fsHelper.root + "/foo/你好.txt"), false);
                this.close();
                done();
            },
            delay: 20
        }).add(fsHelper.root, () => {
            nfs.unlinkSync(fsHelper.root + "/foo/你好.txt");
        });
    }

    export function watchDirAndChangeDir(done: MochaDone) {
        const w = new watcher.FSWatcher({
            onChange(path) {
                assert.ok(false);
            },
            delay: 20
        });
        w.add(fsHelper.root, () => {
            nfs.mkdirSync(fsHelper.root + "/foo/");
            nfs.mkdirSync(fsHelper.root + "/foo/goo");
            setTimeout(() => {
                w.close();
                done();
            }, 60);
        });
    }

    export function watchFileAndChangeFile(done: MochaDone) {
        nfs.mkdirSync(fsHelper.root + "/foo/");
        nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "");
        let c = 0;
        new watcher.FSWatcher({
            onChange(path) {
                c++;
                assert.ok(c <= 2);
                assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
                if (c === 1) {
                    assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "A");
                    nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "B");
                }
                if (c === 2) {
                    assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "B");
                    this.close();
                    done();
                }
            },
            delay: 20
        }).add(fsHelper.root + "/foo/你好.txt", () => {
            nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        });
    }

    export function watchFileAndDeleteFile(done: MochaDone) {
        nfs.mkdirSync(fsHelper.root + "/foo/");
        nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        new watcher.FSWatcher({
            onDelete(path) {
                assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
                assert.equal(nfs.existsSync(fsHelper.root + "/foo/你好.txt"), false);
                nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "B");
                this.close();
                done();
            },
            onChange(name) {
                assert.ok(false);
            },
            delay: 20
        }).add(fsHelper.root + "/foo/你好.txt", () => {
            nfs.unlinkSync(fsHelper.root + "/foo/你好.txt");
        });
    }

    export function addTest(done: MochaDone) {
        const w = new watcher.FSWatcher();
        w.add(fsHelper.root + "/dir", () => {
            assert.equal(w.isWatching, true);
            w.add(fsHelper.root + "/dir/sub", () => {
                w.add(fsHelper.root, () => {
                    w.close();
                    done();
                });
            });
        });
    }

    export function removeTest(done: MochaDone) {
        const w = new watcher.FSWatcher();
        w.add(fsHelper.root, () => {
            assert.equal(w.isWatching, true);
            w.remove(fsHelper.root);
            assert.equal(w.isWatching, false);
            w.close();
            done();
        });

    }

    if (new watcher.FSWatcher().recursive) {
        for (const key in watcherTest) {
            if (!/^(?:before|after)/.test(key)) {
                watcherTest[key + "Slow"] = function (done: MochaDone) {
                    const oldWatcher = watcher.FSWatcher;
                    (<any>watcher).FSWatcher = function (opt) {
                        const r = new oldWatcher(opt);
                        r.recursive = false;
                        return r;
                    };
                    try {
                        watcherTest[key](done);
                    } finally {
                        (<any>watcher).FSWatcher = oldWatcher;
                    }
                };
            }
        }
    }

}
