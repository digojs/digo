import * as assert from "assert";
import * as path from "path";
import * as file from "../../lib/builder/file";

export namespace fileTest {

    export function nameTest() {
        const f = new file.File();
        f.name = "foo.txt";
        assert.equal(f.name, "foo.txt");
    }

    export function pathTest() {
        const f = new file.File("foo.txt");
        assert.equal(f.srcPath, path.resolve("foo.txt"));
        assert.equal(f.destPath, path.resolve("foo.txt"));
        assert.equal(f.path, path.resolve("foo.txt"));
        f.path = "./goo.txt";
        assert.equal(f.path, path.resolve("goo.txt"));
    }
    
}