import "source-map-support/register";
import * as assert from "assert";
import * as file from "../../lib/builder/file";

describe('writer', () => {
    it('Writer', () => {
        const a = new file.File("a.js", "a.js", "");
        const b = new file.File("b.js", "b.js", "B");
        const writer = a.createWriter({ sourceMap: false });
        writer.write("A");
        assert.equal(writer.toString(), "A");
        writer.write("B");
        assert.equal(writer.toString(), "AB");
        writer.write(b.content, b);
        assert.equal(writer.toString(), "ABB");
    });
    it('SourceMapWriter', () => {
        const a = new file.File("a.js","a.js", "");
        const b = new file.File("b.js", "b.js","_B");
        const writer = a.createWriter({ sourceMap: true });
        writer.write("A");
        assert.equal(writer.toString(), "A");
        writer.write("B", b, 0, 1);
        writer.end();
        assert.equal(a.content, "AB");
        const source = a.sourceMapBuilder.getSource(0, 1);
        assert.equal(source.sourcePath, b.path);
        assert.equal(source.line, 0);
        assert.equal(source.column, 1);
    });
});