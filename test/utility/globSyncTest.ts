// import * as assert from "assert";
// import * as np from "path";
// import * as fsHelper from "../helper/fsHelper";
// import * as matcher from "../../lib/utility/matcher";
// import * as globSync from "../../lib/utility/globSync";

// export namespace globSyncTest {

//     export function beforeEach() {
//         fsHelper.init();
//     }

//     export function afterEach() {
//         fsHelper.clean();
//     }

//     export function matchTest1() {
//         const matched = globSync.globSync("*.txt", {
//             cwd: fsHelper.root
//         });
//         assert.deepEqual(matched, [process.cwd() + np.sep + fsHelper.root + np.sep + "file.txt"]);
//     }

//     export function matchTest2() {
//         const matched = [];
//         globSync.globSync("/*.txt", {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//             }
//         });
//     }

//     export function matchTest3() {
//         const matched = [];
//         globSync.globSync(".sub*", {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
//             },
//             end() {
//                 assert.deepEqual(matched, ["dir/sub/.subfile"]);
//             }
//         });
//     }

//     export function matchTest4() {
//         const matched = [];
//         globSync.globSync(new matcher.Matcher("sub/.sub*"), {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, []);
//             }
//         });
//     }

//     export function matchTest5(done: MochaDone) {
//         const matched = [];
//         globSync.globSync("sub", {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
//             },
//             end() {
//                 assert.deepEqual(matched, ["dir/sub/.subfile"]);
//                 done();
//             }
//         });
//     }

//     export function matchTest6(done: MochaDone) {
//         const matched = [];
//         globSync.globSync("dir/sub/.subfile", {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
//             },
//             end() {
//                 assert.deepEqual(matched, ["dir/sub/.subfile"]);
//                 done();
//             }
//         });
//     }

//     export function ignoreTest1() {
//         const matched = [];
//         globSync.globSync("!.subfile", {
//             cwd: fsHelper.root,
//             ignored() { },
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//             }
//         });
//     }

//     export function ignoreTest2() {
//         const matched = [];
//         globSync.globSync(["!.subfile", "*", "*"], {
//             cwd: fsHelper.root,
//             ignored() { },
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 globSync.globSync(["!dir", "*"], {
//                     cwd: fsHelper.root,
//                     ignored() { },
//                     file(file) {
//                         matched.push(np.relative(fsHelper.root, file));
//                     },
//                     end() {
//                         assert.deepEqual(matched, ["file.txt", "file.txt"]);
//                     }
//                 });
//             }
//         });
//     }

//     export function ignoreTest3() {
//         const matched = [];
//         globSync.globSync("!*", {
//             ignored() { },
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, []);
//             }
//         });
//     }

//     export function globalMatcherTest() {
//         const matched = [];
//         globSync.globSync("*", {
//             cwd: fsHelper.root,
//             ignored() { },
//             globalMatcher: new matcher.Matcher(".subfile"),
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
//             },
//             end() {
//                 assert.deepEqual(matched, ["dir/sub/.subfile"]);
//             },
//             walk() {

//             }
//         });
//     }

//     export function globalIgnoreTest1() {
//         const matched = [];
//         globSync.globSync(null, {
//             cwd: fsHelper.root,
//             ignored() { },
//             globalMatcher: new matcher.Matcher("!.subfile"),
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//             }
//         });
//     }

//     export function globalIgnoreTest2() {
//         const matched = [];
//         globSync.globSync(null, {
//             cwd: fsHelper.root,
//             ignored() { },
//             globalMatcher: new matcher.Matcher("!sub"),
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//             }
//         });
//     }

//     export function returnArrayTest() {
//         assert.deepEqual(globSync.globSync("!*"), []);
//         assert.deepEqual(globSync.globSync("*.txt", { cwd: fsHelper.root }), [np.resolve(fsHelper.root, "file.txt")]);
//     }

// }
