import * as assert from "assert";
import * as nfs from "fs";
import * as np from "path";
import * as fsWatcher from "../../lib/utility/fsWatcher";
import * as fsHelper from "../helper/fsHelper";
import * as funcHelper from "../helper/funcHelper";

export namespace fsWatcherTest {

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.uninit();
    }

    export function watchDirAndChangeFile(done: MochaDone) {
        const watcher = new fsWatcher.FSWatcher();
        watcher.delay = 10;
        watcher.on("delete", path => { assert.ok(false); });
        watcher.on("create", path => {
            assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
            assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "A");
            nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "B");
        });
        watcher.on("change", path => {
            assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
            assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "B");
            watcher.close(done);
        });
        watcher.add(fsHelper.root, () => {
            nfs.mkdirSync(fsHelper.root + "/foo/");
            nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        });
    }

    export function watchDirAndDeleteFile(done: MochaDone) {
        nfs.mkdirSync(fsHelper.root + "/foo/");
        nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        const watcher = new fsWatcher.FSWatcher();
        watcher.delay = 10;
        watcher.on("delete", path => {
            assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
            assert.equal(nfs.existsSync(fsHelper.root + "/foo/你好.txt"), false);
            watcher.close(done);
        });
        watcher.on("create", path => { assert.ok(false); });
        watcher.on("change", path => { assert.ok(false); });
        watcher.add(fsHelper.root, () => {
            nfs.unlinkSync(fsHelper.root + "/foo/你好.txt");
        });
    }

    export function watchDirAndChangeDir(done: MochaDone) {
        const watcher = new fsWatcher.FSWatcher();
        watcher.delay = 10;
        watcher.on("delete", path => { assert.ok(false); });
        watcher.on("create", path => { assert.ok(false); });
        watcher.on("change", path => { assert.ok(false); });
        watcher.add(fsHelper.root, () => {
            nfs.mkdirSync(fsHelper.root + "/foo/");
            nfs.mkdirSync(fsHelper.root + "/foo/goo");
            watcher.close(done);
        });
    }

    export function watchFileAndChangeFile(done: MochaDone) {
        nfs.mkdirSync(fsHelper.root + "/foo/");
        nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "O");
        const watcher = new fsWatcher.FSWatcher();
        watcher.delay = 10;
        watcher.usePolling = false;
        watcher.on("delete", path => { assert.ok(false); });
        watcher.on("create", path => { assert.ok(false); });
        watcher.on("change", funcHelper.step(
            (path: string) => {
                assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
                assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "A");
                nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "B");
            },
            (path: string) => {
                assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
                assert.equal(nfs.readFileSync(fsHelper.root + "/foo/你好.txt"), "B");
                watcher.close(done);
            }));
        watcher.add(fsHelper.root + "/foo/你好.txt", () => {
            nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        });
    }

    export function watchFileAndDeleteFile(done: MochaDone) {
        nfs.mkdirSync(fsHelper.root + "/foo/");
        nfs.writeFileSync(fsHelper.root + "/foo/你好.txt", "A");
        const watcher = new fsWatcher.FSWatcher();
        watcher.delay = 10;
        watcher.usePolling = false;
        watcher.on("delete", path => {
            assert.equal(path, np.resolve(fsHelper.root + "/foo/你好.txt"));
            assert.equal(nfs.existsSync(fsHelper.root + "/foo/你好.txt"), false);
            watcher.close(done);
        });
        watcher.on("create", path => { assert.ok(false); });
        watcher.on("change", path => { assert.ok(false); });
        watcher.add(fsHelper.root + "/foo/你好.txt", () => {
            if (process.platform === "darwin") {
                setTimeout(() => {
                    nfs.unlinkSync(fsHelper.root + "/foo/你好.txt");
                }, 1000);
            } else {
                nfs.unlinkSync(fsHelper.root + "/foo/你好.txt");
            }
        });
    }

    export function addTest(done: MochaDone) {
        const watcher = new fsWatcher.FSWatcher();
        watcher.add(fsHelper.root + "/dir1", () => {
            assert.equal(watcher.isWatching, true);
            watcher.add(fsHelper.root + "/dir1/sub1", () => {
                watcher.add(fsHelper.root, () => {
                    watcher.close(done);
                });
            });
        });
    }

    export function removeTest(done: MochaDone) {
        const watcher = new fsWatcher.FSWatcher();
        watcher.add(fsHelper.root, () => {
            assert.equal(watcher.isWatching, true);
            watcher.remove(fsHelper.root);
            assert.equal(watcher.isWatching, false);
            watcher.close(done);
        });
    }

    if (process.platform === "darwin") {
        for (const key in fsWatcherTest) {
            if (!/^(?:before|after)/.test(key)) {
                const oldFunc = (fsWatcherTest as any)[key];
                (fsWatcherTest as any)[key] = (done: Function) => {
                    setTimeout(oldFunc, 1000, done);
                };
            }
        }
    } else if (new fsWatcher.FSWatcher().watchOptions.recursive) {
        for (const key in fsWatcherTest) {
            if (!/^(?:before|after)/.test(key)) {
                (fsWatcherTest as any)[key + "Slow"] = function (done: MochaDone) {
                    const oldAdd = fsWatcher.FSWatcher.prototype.add;
                    const oldClose = fsWatcher.FSWatcher.prototype.close;
                    fsWatcher.FSWatcher.prototype.add = function () {
                        this.watchOptions.recursive = false;
                        return oldAdd.apply(this, arguments);
                    };
                    fsWatcher.FSWatcher.prototype.close = function () {
                        fsWatcher.FSWatcher.prototype.add = oldAdd;
                        fsWatcher.FSWatcher.prototype.close = oldClose;
                        return oldClose.apply(this, arguments);
                    };
                    (fsWatcherTest as any)[key](done);
                };
            }
        }
    }

}
