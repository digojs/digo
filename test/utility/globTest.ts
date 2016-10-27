// import * as assert from "assert";
// import * as np from "path";
// import * as fsHelper from "../helper/fsHelper";
// import * as matcher from "../../lib/utility/matcher";
// import * as glob from "../../lib/utility/glob";

// export namespace matchTest {

//     export function beforeEach() {
//         fsHelper.init();
//     }

//     export function afterEach() {
//         fsHelper.clean();
//     }

//     export function matchTest1(done: MochaDone) {
//         const matched = [];
//         glob.glob("*.txt", {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 done();
//             }
//         });
//     }

//     export function matchTest2(done: MochaDone) {
//         const matched = [];
//         glob.glob("/*.txt", {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 done();
//             }
//         });
//     }

//     export function matchTest3(done: MochaDone) {
//         const matched = [];
//         glob.glob(".sub*", {
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

//     export function matchTest4(done: MochaDone) {
//         const matched = [];
//         glob.glob(new matcher.Matcher("sub/.sub*"), {
//             cwd: fsHelper.root,
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, []);
//                 done();
//             }
//         });
//     }

//     export function matchTest5(done: MochaDone) {
//         const matched = [];
//         glob.glob("sub", {
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
//         glob.glob("dir/sub/.subfile", {
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

//     export function ignoreTest1(done: MochaDone) {
//         const matched = [];
//         glob.glob("!.subfile", {
//             cwd: fsHelper.root,
//             ignored() { },
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 done();
//             }
//         });
//     }

//     export function ignoreTest2(done: MochaDone) {
//         const matched = [];
//         glob.glob(["!.subfile", "*", "*"], {
//             cwd: fsHelper.root,
//             ignored() { },
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 glob.glob(["!dir", "*"], {
//                     cwd: fsHelper.root,
//                     ignored() { },
//                     file(file) {
//                         matched.push(np.relative(fsHelper.root, file));
//                     },
//                     end() {
//                         assert.deepEqual(matched, ["file.txt", "file.txt"]);
//                         done();
//                     }
//                 });
//             }
//         });
//     }

//     export function ignoreTest3(done: MochaDone) {
//         const matched = [];
//         glob.glob("!*", {
//             ignored() { },
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, []);
//                 done();
//             }
//         });
//     }

//     export function globalMatcherTest(done: MochaDone) {
//         const matched = [];
//         glob.glob("*", {
//             cwd: fsHelper.root,
//             ignored() { },
//             globalMatcher: new matcher.Matcher(".subfile"),
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file).replace(/\\/g, "/"));
//             },
//             end() {
//                 assert.deepEqual(matched, ["dir/sub/.subfile"]);
//                 done();
//             },
//             walk() {

//             }
//         });
//     }

//     export function globalIgnoreTest1(done: MochaDone) {
//         const matched = [];
//         glob.glob(null, {
//             cwd: fsHelper.root,
//             ignored() { },
//             globalMatcher: new matcher.Matcher("!.subfile"),
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 done();
//             }
//         });
//     }

//     export function globalIgnoreTest2(done: MochaDone) {
//         const matched = [];
//         glob.glob(null, {
//             cwd: fsHelper.root,
//             ignored() { },
//             globalMatcher: new matcher.Matcher("!sub"),
//             file(file) {
//                 matched.push(np.relative(fsHelper.root, file));
//             },
//             end() {
//                 assert.deepEqual(matched, ["file.txt"]);
//                 done();
//             }
//         });
//     }

//     export function errorTest() {
//         glob.glob(".none-exists");
//     }

// }
