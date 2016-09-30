import "source-map-support/register";
import * as assert from "assert";
import * as path from "path";
import * as file from "../../lib/builder/file";

describe('file', () => {
    it('name', () => {
        const f = new file.File("a.txt");
        assert.equal(f.srcName, "a.txt");
        assert.equal(f.destName, "a.txt");
        assert.equal(f.name, "a.txt");
        f.name = "b.txt";
        assert.equal(f.name, "b.txt");
    });
    it('path', () => {
        const f = new file.File("a.txt");
        assert.equal(f.srcPath, path.resolve("a.txt"));
        assert.equal(f.destPath, path.resolve("a.txt"));
        assert.equal(f.path, path.resolve("a.txt"));
        f.path = "./b.txt";
        assert.equal(f.path, path.resolve("b.txt"));
    });
});