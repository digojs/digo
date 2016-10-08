import * as assert from "assert";
import * as np from "path";
import * as fsHelper from "./fsHelper";
import * as matcher from "../../lib/utility/matcher";
import * as globSync from "../../lib/utility/globSync";

export namespace globSyncTest {

    export function beforeEach() {
        fsHelper.init();
    }

    export function afterEach() {
        fsHelper.clean();
    }

    export function matchTest1() {
        const matched = globSync.globSync("*.txt", {
            cwd: fsHelper.root
        });
        assert.deepEqual(matched, [process.cwd() + np.sep + fsHelper.root + np.sep + "file.txt"]);
    }

    export function matchTest2() {
        const matched = [];
        globSync.globSync("/*.txt", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
            }
        });
    }

    export function matchTest3() {
        const matched = [];
        globSync.globSync(".sub*", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
            },
            end() {
                assert.deepEqual(matched, ["dir/sub/.subfile"]);
            }
        });
    }

    export function matchTest4() {
        const matched = [];
        globSync.globSync("sub/.sub*", {
            cwd: fsHelper.root,
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, []);
            }
        });
    }

    export function ignoreTest() {
        const matched = [];
        globSync.globSync("!.subfile", {
            cwd: fsHelper.root,
            ignored() { },
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
            }
        });
    }

    export function ignoreTest2() {
        const matched = [];
        globSync.globSync(["!.subfile", "*", "*"], {
            cwd: fsHelper.root,
            ignored() { },
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
                globSync.globSync(["!dir", "*"], {
                    cwd: fsHelper.root,
                    ignored() { },
                    match(file) {
                        matched.push(np.relative(fsHelper.root, file));
                    },
                    end() {
                        assert.deepEqual(matched, ["file.txt", "file.txt"]);
                    }
                });
            }
        });
    }

    export function globalIgnoreTest() {
        const matched = [];
        globSync.globSync("*", {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("*.txt"),
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
            },
            walk() {

            }
        });
    }

    export function emptyTest() {
        const matched = [];
        globSync.globSync(null, {
            cwd: fsHelper.root,
            ignored() { },
            globalMatcher: new matcher.Matcher("!.subfile"),
            match(file) {
                matched.push(np.relative(fsHelper.root, file));
            },
            end() {
                assert.deepEqual(matched, ["file.txt"]);
            }
        });
    }

}
