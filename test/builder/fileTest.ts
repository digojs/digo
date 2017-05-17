import * as assert from "assert";
import * as path from "path";
import * as file from "../../lib/builder/file";
import * as consoleHelper from "../helper/consoleHelper";
import * as fsHelper from "../helper/fsHelper";
import progress = require("../../lib/builder/progress");

export namespace fileTest {

    const oldProgress = progress.progress;
    export function before() {
        progress.progress = false;
    }

    export function after() {
        progress.progress = oldProgress;
    }

    export function pathTest() {
        const f = new file.File("foo/src.js", "foo");
        assert.equal(f.srcPath, path.resolve("foo/src.js"));
        assert.equal(f.destPath, path.resolve("foo/src.js"));
        assert.equal(f.path, path.resolve("foo/src.js"));
        assert.equal(f.name, "src.js");

        f.path = "foo/dest.js";
        assert.equal(f.srcPath, path.resolve("foo/src.js"));
        assert.equal(f.destPath, path.resolve("foo/dest.js"));
        assert.equal(f.path, path.resolve("foo/dest.js"));
        assert.equal(f.base, path.resolve("foo"));
        assert.equal(f.name, "dest.js");
    }

    export function baseTest() {
        const f = new file.File("foo/src.js", "foo");
        assert.equal(f.base, path.resolve("foo"));

        f.base = "goo";
        assert.equal(f.base, "goo");
        assert.equal(f.path, path.resolve("goo/src.js"));
    }

    export function dirTest() {
        const f = new file.File("foo/src.js", "foo");
        assert.equal(f.srcDir, path.resolve("foo"));
        assert.equal(f.destDir, path.resolve("foo"));
        assert.equal(f.dir, path.resolve("foo"));

        f.dir = "goo";
        assert.equal(f.srcDir, path.resolve("foo"));
        assert.equal(f.destDir, path.resolve("goo"));
        assert.equal(f.dir, path.resolve("goo"));
        assert.equal(f.path, path.resolve("goo/src.js"));
    }

    export function extTest() {
        const f = new file.File("foo/src.js", "foo");
        assert.equal(f.srcExt, ".js");
        assert.equal(f.destExt, ".js");
        assert.equal(f.ext, ".js");

        f.ext = ".css";
        assert.equal(f.srcExt, ".js");
        assert.equal(f.destExt, ".css");
        assert.equal(f.ext, ".css");
        assert.equal(f.path, path.resolve("foo/src.css"));
    }

    export function existsTest() {
        assert.equal(new file.File("foo/src.js", "foo").exists, false);
    }

    export function toStringTest() {
        new file.File("foo/src.js", "foo").toString();
        (new file.File("foo/src.js", "foo") as any).inspect();
    }

    export function bufferTest() {
        assert.equal(new file.File().buffer.toString(), "");

        const f = new file.File("foo/src.js", "foo");
        f.buffer = new Buffer("abc");
        assert.equal(f.buffer.toString(), "abc");
        assert.equal(f.destBuffer.toString(), "abc");
        assert.equal(f.content, "abc");
        assert.equal(f.destContent, "abc");
        assert.equal(f.data.toString(), "abc");

        fsHelper.init({ "f1.txt": "f1.txt" });
        try {
            assert.equal(new file.File("f1.txt").srcBuffer.toString(), "f1.txt");
        } finally {
            fsHelper.uninit();
        }
    }

    export function contentTest() {
        assert.equal(new file.File().content, "");

        const f = new file.File("foo/src.js", "foo");
        f.content = "abc";
        assert.equal(f.buffer.toString(), "abc");
        assert.equal(f.destBuffer.toString(), "abc");
        assert.equal(f.content, "abc");
        assert.equal(f.destContent, "abc");
        assert.equal(f.data.toString(), "abc");

        fsHelper.init({ "f1.txt": "f1.txt" });
        try {
            assert.equal(new file.File("f1.txt").srcContent, "f1.txt");
        } finally {
            fsHelper.uninit();
        }
    }

    export function modifiedTest() {
        const f = new file.File("foo/src.js", "foo");
        assert.equal(f.modified, false);
        f.data = "abc";
        assert.equal(f.modified, true);
    }

    export function locationTest() {
        const f = new file.File("foo/src.js", "foo");
        f.data = "abc";
        assert.deepEqual(f.indexToLocation(0), { line: 0, column: 0 });
        assert.deepEqual(f.locationToIndex({ line: 0, column: 0 }), 0);
    }

    export function loadTest(done: MochaDone) {
        fsHelper.init({ "f1.txt": "f1.txt" });
        new file.File("f1.txt").load((error, file) => {
            assert.equal(file.srcContent, "f1.txt");
            fsHelper.uninit();
            done();
        });
    }

    export function saveTest(done: MochaDone) {
        fsHelper.init({});
        const f = new file.File();
        f.path = "f1.txt";
        f.content = "f1.txt";
        f.save(".", (error, file) => {
            fsHelper.check({ "f1.txt": "f1.txt" });
            fsHelper.uninit();
            done();
        });
    }

    export function deleteTest(done: MochaDone) {
        fsHelper.init({ "f1.txt": "f1.txt" });
        new file.File("f1.txt").delete(false, (error, file) => {
            assert.equal(file.exists, false);
            fsHelper.uninit();
            done();
        });
    }

    export function logTest() {
        consoleHelper.redirectOutput(() => {
            new file.File("f1.txt").log("hello");
        });
    }

    export function sourceMapTest() {
        const f = new file.File();
        const writer = f.createWriter({ sourceMap: true });
        writer.write("1", 0, 1, "src.js");
        writer.end();

        assert.ok(f.sourceMapObject);
    }

}
