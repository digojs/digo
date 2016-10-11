import * as assert from "assert";
import * as sourceMap from "../../lib/utility/sourceMap";
import * as file from "../../lib/builder/file";
import { SourceMapWriter } from "../../lib/builder/writer";

export namespace writerTest {

    export function writeTest() {
        const foo = new file.File("foo.js");
        const writer = foo.createWriter({ sourceMap: false });

        writer.write("A");
        assert.equal(writer.toString(), "A");

        writer.write("_B_", 1, 2);
        assert.equal(writer.toString(), "AB");

        const goo = new file.File("goo.js");
        goo.content = "C";
        writer.writeFile(goo);
        assert.equal(writer.toString(), "ABC");

        const hoo = new file.File("hoo.js");
        goo.content = "_D_";
        writer.writeFile(goo, 1, 2);
        assert.equal(writer.toString(), "ABCD");

        writer.end();
        assert.equal(foo.content, writer.toString());
    }

    export function writeSourceMapTest() {
        const foo = new file.File("foo.js");
        const writer = foo.createWriter({ sourceMap: true });
        assert.ok((<SourceMapWriter>writer).sourceMap);

        writer.write("A");
        assert.equal(writer.toString(), "A");

        writer.write("_B_", 1, 2);
        assert.equal(writer.toString(), "AB");

        const goo = new file.File("goo.js");
        goo.content = "C";
        writer.writeFile(goo);
        assert.equal(writer.toString(), "ABC");

        const hoo = new file.File("hoo.js");
        hoo.content = "_D_";
        writer.writeFile(hoo, 1, 2);
        assert.equal(writer.toString(), "ABCD");

        writer.end();
        assert.equal(foo.content, writer.toString());

        assert.equal(foo.sourceMapBuilder.getSource(0, 0).sourcePath, foo.path);
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).sourcePath, foo.path);
        assert.equal(foo.sourceMapBuilder.getSource(0, 2).sourcePath, goo.path);
        assert.equal(foo.sourceMapBuilder.getSource(0, 2).line, 0);
        assert.equal(foo.sourceMapBuilder.getSource(0, 2).column, 0);
        assert.equal(foo.sourceMapBuilder.getSource(0, 3).sourcePath, hoo.path);
        assert.equal(foo.sourceMapBuilder.getSource(0, 3).line, 0);
        assert.equal(foo.sourceMapBuilder.getSource(0, 3).column, 1);
        assert.equal(foo.sourceMapBuilder.getSource(0, 4).sourcePath, hoo.path);
    }

    export function writeStreamTest() {
        const foo = new file.File("foo.js");
        const writer = foo.createStream({ capacity: 2 });
        assert.equal(writer.capacity, 2);
        writer.write(new Buffer([49]));
        writer.write(new Buffer([49, 49]));
        assert.equal(writer.toString(), "111");
        writer.end();
        assert.equal(foo.content, writer.toString());
    }

    export function indentTest() {
        const foo = new file.File("foo.js");
        const writer = foo.createWriter({ indentChar: "\t" });
        writer.indent();
        writer.write("A");
        writer.unindent();
        assert.equal(writer.toString(), "\tA");

        writer.indent();
        writer.write("\nB");
        writer.unindent();
        assert.equal(writer.toString(), "\tA\n\tB");
    }

    export function indentSourceMapTest() {
        const foo = new file.File("foo.js");
        const writer = foo.createWriter({ sourceMap: true, indentChar: "\t" });
        writer.indent();
        writer.write("A");
        writer.unindent();
        assert.equal(writer.toString(), "\tA");

        writer.indent();
        writer.write("\nB");
        writer.unindent();
        assert.equal(writer.toString(), "\tA\n\tB");
    }

    export function mergeSourceMapTest() {
        const foo = new file.File("foo.js");

        const goo = new file.File("goo.js");
        goo.content = "\r\nABC";
        goo.sourceMapData = new sourceMap.SourceMapBuilder();
        goo.sourceMapBuilder.addMapping(1, 1, "hoo.js", 100, 101, "B");
        goo.sourceMapBuilder.addMapping(1, 2, "hoo2.js", 200, 201, "C");

        const writer = foo.createWriter({ sourceMap: true });
        writer.writeFile(goo);
        writer.end();
        assert.equal(foo.content, "\r\nABC");

        assert.equal(foo.sourceMapBuilder.getSource(1, 0).sourcePath, goo.path);
        assert.equal(foo.sourceMapBuilder.getSource(1, 0).line, 1);
        assert.equal(foo.sourceMapBuilder.getSource(1, 0).column, 0);
        assert.equal(foo.sourceMapBuilder.getSource(1, 0).name, undefined);

        assert.equal(foo.sourceMapBuilder.getSource(1, 1).sourcePath, "hoo.js");
        assert.equal(foo.sourceMapBuilder.getSource(1, 1).line, 100);
        assert.equal(foo.sourceMapBuilder.getSource(1, 1).column, 101);
        assert.equal(foo.sourceMapBuilder.getSource(1, 1).name, "B");

        assert.equal(foo.sourceMapBuilder.getSource(1, 2).sourcePath, "hoo2.js");
        assert.equal(foo.sourceMapBuilder.getSource(1, 2).line, 200);
        assert.equal(foo.sourceMapBuilder.getSource(1, 2).column, 201);
        assert.equal(foo.sourceMapBuilder.getSource(1, 2).name, "C");

    }

    export function mergeSourceMapTest2() {
        const foo = new file.File("foo.js");

        const goo = new file.File("goo.js");
        goo.content = "ABC";
        goo.sourceMapData = new sourceMap.SourceMapBuilder();
        goo.sourceMapBuilder.addMapping(0, 0, "hoo1.js", 11, 1, "A");
        goo.sourceMapBuilder.addMapping(0, 1, "hoo2.js", 12, 2, "B");
        goo.sourceMapBuilder.addMapping(0, 2, "hoo3.js", 13, 3, "C");
        goo.sourceMapBuilder.addMapping(0, 3, "hoo4.js", 14, 4, "D");

        const writer = foo.createWriter({ sourceMap: true });
        writer.writeFile(goo, 1);
        writer.end();
        assert.equal(foo.content, "BC");

        assert.equal(foo.sourceMapBuilder.getSource(0, 0).sourcePath, "hoo2.js");
        assert.equal(foo.sourceMapBuilder.getSource(0, 0).line, 12);
        assert.equal(foo.sourceMapBuilder.getSource(0, 0).column, 2);
        assert.equal(foo.sourceMapBuilder.getSource(0, 0).name, "B");

        assert.equal(foo.sourceMapBuilder.getSource(0, 1).sourcePath, "hoo3.js");
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).line, 13);
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).column, 3);
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).name, "C");

    }

    export function mergeSourceMapTest3() {
        const foo = new file.File("foo.js");

        const goo = new file.File("goo.js");
        goo.content = "AB\rC";
        goo.sourceMapData = new sourceMap.SourceMapBuilder();
        goo.sourceMapBuilder.addMapping(0, 0, "hoo1.js", 11, 1, "A");
        goo.sourceMapBuilder.addMapping(0, 1, "hoo2.js", 12, 2, "B");
        goo.sourceMapBuilder.addMapping(0, 2, "hoo3.js", 13, 3, "C");
        goo.sourceMapBuilder.addMapping(1, 3, "hoo4.js", 14, 4, "D");

        const writer = foo.createWriter({ sourceMap: true });
        writer.writeFile(goo, 1);
        writer.end();
        assert.equal(foo.content, "B\rC");

        assert.equal(foo.sourceMapBuilder.getSource(0, 0).sourcePath, "hoo2.js");
        assert.equal(foo.sourceMapBuilder.getSource(0, 0).line, 12);
        assert.equal(foo.sourceMapBuilder.getSource(0, 0).column, 2);
        assert.equal(foo.sourceMapBuilder.getSource(0, 0).name, "B");

        assert.equal(foo.sourceMapBuilder.getSource(0, 1).sourcePath, "hoo3.js");
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).line, 13);
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).column, 3);
        assert.equal(foo.sourceMapBuilder.getSource(0, 1).name, "C");

    }

}