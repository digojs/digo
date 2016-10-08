import * as assert from "assert";
import * as np from "path";
import * as fsHelper from "./fsHelper";
import * as matcher from "../../lib/utility/matcher";
import * as glob from "../../lib/utility/glob";

export namespace matchTest {

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.clean();
    }

    export function matchTest1(done: MochaDone) {
        const matched = [];
        glob.glob("*.txt", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                done();
            }
        });
    }

    export function matchTest2(done: MochaDone) {
        const matched = [];
        glob.glob("/*.txt", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                done();
            }
        });
    }

    export function matchTest3(done: MochaDone) {
        const matched = [];
        glob.glob(".sub*", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                assert.deepEqual(matched, ["dir/sub/.subfile"]);
                done();
            }
        });
    }

    export function matchTest4(done: MochaDone) {
        const matched = [];
        glob.glob("sub/.sub*", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, []);
                done();
            }
        });
    }

    export function ignoreTest(done: MochaDone) {
        const matched = [];
        glob.glob("!.subfile", {
            cwd: fsHelper.root,
            ignored() { },
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                done();
            }
        });
    }

    export function ignoreTest2(done: MochaDone) {
        const matched = [];
        glob.glob(["!.subfile", "*", "*"], {
            cwd: fsHelper.root,
            ignored() { },
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                glob.glob(["!dir", "*"], {
                    cwd: fsHelper.root,
                    ignored() { },
                    match(file) {
                        matched.push(np.relative(fsHelper.root, file));
                    },
                    end() {
                        assert.deepEqual(matched, ["file.txt", "file.txt"]);
                        done();
                    }
                });
            }
        });
    }

    export function globalIgnoreTest(done: MochaDone) {
        const matched = [];
        glob.glob("*", {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("*.txt"),
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                done();
            },
            walk() {

            }
        });
    }

    export function emptyTest(done: MochaDone) {
        const matched = [];
        glob.glob(null, {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("!.subfile"),
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                done();
            }
        });
    }

}
