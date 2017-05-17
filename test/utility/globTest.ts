import * as assert from "assert";
import * as np from "path";
import glob from "../../lib/utility/glob";
import * as matcher from "../../lib/utility/matcher";
import * as fsHelper from "../helper/fsHelper";

export namespace globTest {

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.uninit();
    }

    export function matchTest1(done: MochaDone) {
        const matched: string[] = [];
        glob("*.txt", {
            cwd: fsHelper.root,
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, [
                    "dir1/sub1/f3.txt",
                    "dir1/sub1/f4.txt",
                    "dir1/sub2/f5.txt",
                    "f1.txt",
                    "f2.txt"
                ]);
                done();
            }
        });
    }

    export function matchTest2(done: MochaDone) {
        const matched: string[] = [];
        glob("./*.txt", {
            cwd: fsHelper.root,
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["f1.txt", "f2.txt"]);
                done();
            }
        });
    }

    export function matchTest3(done: MochaDone) {
        const matched: string[] = [];
        glob("sub*", {
            cwd: fsHelper.root,
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt", "dir1/sub2/f5.txt"]);
                done();
            }
        });
    }

    export function matchTest4(done: MochaDone) {
        const matched: string[] = [];
        glob(new matcher.Matcher("sub/f*.txt"), {
            cwd: fsHelper.root,
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, []);
                done();
            }
        });
    }

    export function matchTest5(done: MochaDone) {
        const matched: string[] = [];
        glob("sub1", {
            cwd: fsHelper.root,
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt"]);
                done();
            }
        });
    }

    export function matchTest6(done: MochaDone) {
        const matched: string[] = [];
        glob("dir1/sub1/f3.txt", {
            cwd: fsHelper.root,
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["dir1/sub1/f3.txt"]);
                done();
            }
        });
    }

    export function matchTest7(done: MochaDone) {
        glob("sub1", {
            cwd: fsHelper.root,
            end(files) {
                files = files.map(file => np.relative(fsHelper.root, file).replace(/\\/g, "/"));
                files.sort();
                assert.deepEqual(files, ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt"]);
                done();
            }
        });
    }

    export function ignoreTest1(done: MochaDone) {
        const matched: string[] = [];
        glob("!f5.txt", {
            cwd: fsHelper.root,
            ignored() { },
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, [
                    "dir1/sub1/f3.txt",
                    "dir1/sub1/f4.txt",
                    "f1.txt",
                    "f2.txt"
                ]);
                done();
            }
        });
    }

    export function ignoreTest2(done: MochaDone) {
        const matched: string[] = [];
        glob(["!f5.txt", "*", "*"], {
            cwd: fsHelper.root,
            ignored() { },
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt", "f1.txt", "f2.txt"]);
                matched.length = 0;
                glob(["!dir1", "*"], {
                    cwd: fsHelper.root,
                    ignored() { },
                    file(file) {
                        matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
                    },
                    end() {
                        matched.sort();
                        assert.deepEqual(matched, ["f1.txt", "f2.txt"]);
                        done();
                    }
                });
            }
        });
    }

    export function ignoreTest3(done: MochaDone) {
        const matched: string[] = [];
        glob("!*", {
            ignored() { },
            file(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, []);
                done();
            }
        });
    }

    export function globalMatcherTest(done: MochaDone) {
        const matched: string[] = [];
        glob("*", {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("f4.txt"),
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                assert.deepEqual(matched, ["dir1/sub1/f4.txt"]);
                done();
            },
            walk() {

            }
        });
    }

    export function globalIgnoreTest1(done: MochaDone) {
        const matched: string[] = [];
        glob(null as any, {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("!f4.txt"),
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["dir1/sub1/f3.txt", "dir1/sub2/f5.txt", "f1.txt", "f2.txt"]);
                done();
            }
        });
    }

    export function globalIgnoreTest2(done: MochaDone) {
        const matched: string[] = [];
        glob(null as any, {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("!sub1"),
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["dir1/sub2/f5.txt", "f1.txt", "f2.txt"]);
                done();
            }
        });
    }

    export function errorTest() {
        assert.deepEqual(glob(".none-exists"), []);
    }

    export function globDirTest(done: MochaDone) {
        const matched: string[] = [];
        glob("*", {
            file(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            dir(path) {
                if (/dir1/.test(path)) {
                    return false;
                }
            },
            end() {
                matched.sort();
                assert.deepEqual(matched, ["f1.txt", "f2.txt"]);
                done();
            }
        });
    }

    export function globSyncTest() {
        const matched = glob("*.txt", {
            cwd: fsHelper.root
        });
        matched.sort();
        assert.deepEqual(matched.map(file => np.relative(fsHelper.root, file).replace(/\\/g, "/")), ["dir1/sub1/f3.txt", "dir1/sub1/f4.txt", "dir1/sub2/f5.txt", "f1.txt", "f2.txt"]);
    }

}
