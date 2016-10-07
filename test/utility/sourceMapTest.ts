import "source-map-support/register";
import * as assert from "assert";
import * as sourceMap from "../../lib/utility/sourceMap";

export namespace sourceMapTest {

    const map = {
        "version": 3,
        "file": "example.js",
        "sourceRoot": "sourceRoot",
        "sources": [
            "source.js"
        ],
        "sourcesContent": [
            "sourceContent"
        ],
        "names": [
            "name"
        ],
        "mappings": ";AAAAA,IAAA;;AAAA,MAAA,GAAS,SAAC,CAAD"
    };

    export function toSourceMapStringTest() {
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(map)), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(JSON.stringify(map))), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(sourceMap.toSourceMapObject(map))), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapString(sourceMap.toSourceMapBuilder(map))), map);
    }

    export function toSourceMapObjectTest() {
        assert.deepEqual(sourceMap.toSourceMapObject(map), map);
        assert.deepEqual(sourceMap.toSourceMapObject(JSON.stringify(map)), map);
        assert.deepEqual(sourceMap.toSourceMapObject(sourceMap.toSourceMapObject(map)), map);
        assert.deepEqual(sourceMap.toSourceMapObject(sourceMap.toSourceMapBuilder(map)), map);
        try { sourceMap.toSourceMapObject(<any>{ sections: [] }) } catch (e) { }
        try { sourceMap.toSourceMapObject(<any>{ version: 2 }) } catch (e) { }
    }

    export function toSourceMapBuilderTest() {
        assert.deepEqual(sourceMap.toSourceMapBuilder(map).toJSON(), map);
        assert.deepEqual(sourceMap.toSourceMapBuilder(JSON.stringify(map)).toJSON(), map);
        assert.deepEqual(sourceMap.toSourceMapBuilder(sourceMap.toSourceMapObject(map)).toJSON(), map);
        assert.deepEqual(sourceMap.toSourceMapBuilder(sourceMap.toSourceMapBuilder(map)).toJSON(), map);
    }

    export function addSourceTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.sourceRoot = "root";
        assert.equal(b.addSource("foo"), 0);
        assert.deepEqual(b.sources, ["root/foo"]);
        assert.equal(b.addSource("goo", "A"), 1);
        assert.deepEqual(b.sources, ["root/foo", "root/goo"]);
        assert.deepEqual(b.sourcesContent, [, "A"]);
    }

    export function addNameTest() {
        const b = new sourceMap.SourceMapBuilder();
        assert.equal(b.addName("b"), 0);
        assert.deepEqual(b.names, ["b"]);
    }

    export function getSourceContentTest() {
        const b = new sourceMap.SourceMapBuilder();
        assert.equal(b.getSourceContent("b"), undefined);
        b.addSource("b");
        b.setSourceContent("b", "A");
        assert.equal(b.getSourceContent("b"), "A");
    }

    export function setSourceContentTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addSource("b");
        b.setSourceContent("b", "A");
        assert.deepEqual(b.sourcesContent, ["A"]);
        b.setSourceContent("b", "B");
        assert.deepEqual(b.sourcesContent, ["B"]);
    }

    export function parseTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.parse(map);
        assert.equal(b.version, map.version);
        assert.equal(b.file, map.file);
        assert.equal(b.sourceRoot, map.sourceRoot);
        assert.deepEqual(b.sources, [map.sourceRoot + "/" + map.sources[0]]);
        assert.deepEqual(b.names, map.names);
        assert.deepEqual(b.mappings, [
            [],
            [
                { column: 0, sourceIndex: 0, sourceLine: 0, sourceColumn: 0, nameIndex: 0 },
                { column: 4, sourceIndex: 0, sourceLine: 0, sourceColumn: 0 }
            ],
            [],
            [
                { column: 0, sourceIndex: 0, sourceLine: 0, sourceColumn: 0 },
                { column: 6, sourceIndex: 0, sourceLine: 0, sourceColumn: 0 },
                { column: 9, sourceIndex: 0, sourceLine: 0, sourceColumn: 9 },
                { column: 18, sourceIndex: 0, sourceLine: 0, sourceColumn: 10 },
                { column: 19, sourceIndex: 0, sourceLine: 0, sourceColumn: 9 }
            ]
        ]);

        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "A"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAAAAAAA"
        });
        new sourceMap.SourceMapBuilder({
            version: 3,
            sources: ["foo.js"],
            mappings: "AAAA,AAAAA,AAAAAA,AAAAAAAAA,AAAAAAAA,,;;a,9,+,/,g,h"
        });
    }

    export function toJSONAndToStringTest() {
        assert.deepEqual(sourceMap.toSourceMapBuilder(map).toJSON(), map);
        assert.deepEqual(JSON.parse(sourceMap.toSourceMapBuilder(map).toString()), map);
        assert.deepEqual(JSON.parse(JSON.stringify(sourceMap.toSourceMapBuilder(map))), map);
        const a = new sourceMap.SourceMapBuilder();
        a.addMapping(10002, 1043433);
        const b = new sourceMap.SourceMapBuilder(a.toString());
        assert.equal(b.mappings[10002][0].column, 1043433);
    }

    export function getSourceTest() {
        function clean(o) {
            delete o.mapping;
            delete o.sourceContent;
            delete o.name;
            return o;
        }
        const b = sourceMap.toSourceMapBuilder(map);
        assert.deepEqual(clean(b.getSource(0, 0)), { sourcePath: "example.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(0, 1)), { sourcePath: "example.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(0, 2)), { sourcePath: "example.js", line: 0, column: 2 });
        assert.deepEqual(clean(b.getSource(1, 0)), { sourcePath: "sourceRoot/source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(1, 1)), { sourcePath: "sourceRoot/source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(1, 2)), { sourcePath: "sourceRoot/source.js", line: 0, column: 2 });
        assert.deepEqual(clean(b.getSource(1, 3)), { sourcePath: "sourceRoot/source.js", line: 0, column: 3 });
        assert.deepEqual(clean(b.getSource(1, 4)), { sourcePath: "sourceRoot/source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(1, 5)), { sourcePath: "sourceRoot/source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(1, 6)), { sourcePath: "sourceRoot/source.js", line: 0, column: 2 });
        assert.deepEqual(clean(b.getSource(2, 0)), { sourcePath: "sourceRoot/source.js", line: 1, column: 0 });
        assert.deepEqual(clean(b.getSource(2, 1)), { sourcePath: "sourceRoot/source.js", line: 1, column: 1 });
        assert.deepEqual(clean(b.getSource(3, 0)), { sourcePath: "sourceRoot/source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(3, 1)), { sourcePath: "sourceRoot/source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(3, 5)), { sourcePath: "sourceRoot/source.js", line: 0, column: 5 });
        assert.deepEqual(clean(b.getSource(3, 6)), { sourcePath: "sourceRoot/source.js", line: 0, column: 0 });
        assert.deepEqual(clean(b.getSource(3, 7)), { sourcePath: "sourceRoot/source.js", line: 0, column: 1 });
        assert.deepEqual(clean(b.getSource(3, 8)), { sourcePath: "sourceRoot/source.js", line: 0, column: 2 });
        assert.deepEqual(clean(b.getSource(3, 9)), { sourcePath: "sourceRoot/source.js", line: 0, column: 9 });
        assert.deepEqual(clean(b.getSource(3, 10)), { sourcePath: "sourceRoot/source.js", line: 0, column: 10 });
        assert.deepEqual(clean(b.getSource(3, 17)), { sourcePath: "sourceRoot/source.js", line: 0, column: 17 });
        assert.deepEqual(clean(b.getSource(3, 18)), { sourcePath: "sourceRoot/source.js", line: 0, column: 10 });
        assert.deepEqual(clean(b.getSource(3, 19)), { sourcePath: "sourceRoot/source.js", line: 0, column: 9 });
        assert.deepEqual(clean(b.getSource(3, 20)), { sourcePath: "sourceRoot/source.js", line: 0, column: 10 });
        assert.deepEqual(clean(b.getSource(3, 21)), { sourcePath: "sourceRoot/source.js", line: 0, column: 11 });
        assert.deepEqual(clean(b.getSource(4, 0)), { sourcePath: "sourceRoot/source.js", line: 1, column: 0 });
        assert.deepEqual(clean(b.getSource(4, 1)), { sourcePath: "sourceRoot/source.js", line: 1, column: 1 });
    }

    export function addMappingTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addMapping(0, 10, "foo.js", 1, 2);
        assert.deepEqual(b.mappings, [
            [
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 }
            ]
        ]);
        b.addMapping(0, 10, "foo.js", 1, 3);
        assert.deepEqual(b.mappings, [
            [
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ]
        ]);
        b.addMapping(0, 9, "foo.js", 1, 3);
        assert.deepEqual(b.mappings, [
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ]
        ]);
        b.addMapping(1, 9, "foo.js", 1, 3, "name");
        assert.deepEqual(b.mappings, [
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 5, "foo.js", 1, 3, "name");
        assert.deepEqual(b.mappings, [
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { column: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 8, "foo.js", 2, 7);
        assert.deepEqual(b.mappings, [
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { column: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { column: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 6);
        assert.deepEqual(b.mappings, [
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { column: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { column: 6 },
                { column: 8, sourceIndex: 0, sourceLine: 2, sourceColumn: 7 },
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
        b.addMapping(1, 8);
        assert.deepEqual(b.mappings, [
            [
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 2 },
                { column: 10, sourceIndex: 0, sourceLine: 1, sourceColumn: 3 }
            ],
            [
                { column: 5, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 },
                { column: 6 },
                { column: 8 },
                { column: 9, sourceIndex: 0, sourceLine: 1, sourceColumn: 3, nameIndex: 0 }
            ]
        ]);
    }

    export function eachMappdingTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addMapping(0, 10, "a.js", 1, 2);
        b.addMapping(0, 9, "a.js", 1, 3);
        const columns = [];
        b.eachMapping((line, column) => {
            columns.push(column);
        });
        assert.deepEqual(columns, [9, 10]);
    }

    export function applySourceMapTest() {
        const a = new sourceMap.SourceMapBuilder();
        a.addMapping(1, 1, "foo.js", 101, 99);
        a.addMapping(1, 6, "foo.js", 101, 103);
        a.addMapping(2, 0, "foo.js", 102, 0);
        const b = new sourceMap.SourceMapBuilder();
        b.file = "foo.js";
        b.addMapping(101, 101, "goo.js", 201, 202, "name");
        b.addMapping(101, 109, "goo.js", 201, 202);
        b.addMapping(102, 0, "goo.js", 301, 302, "name2");
        a.applySourceMap(b);
        function clean(o) {
            delete o.mapping;
            delete o.sourceContent;
            if (!o.name) delete o.name;
            return o;
        }
        assert.deepEqual(clean(a.getSource(1, 1)), { sourcePath: "foo.js", line: 101, column: 99 });
        assert.deepEqual(clean(a.getSource(1, 2)), { sourcePath: "foo.js", line: 101, column: 100 });
        assert.deepEqual(clean(a.getSource(1, 3)), { sourcePath: "goo.js", line: 201, column: 202, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 4)), { sourcePath: "goo.js", line: 201, column: 203 });
        assert.deepEqual(clean(a.getSource(1, 5)), { sourcePath: "goo.js", line: 201, column: 204 });
        assert.deepEqual(clean(a.getSource(1, 6)), { sourcePath: "goo.js", line: 201, column: 204 });
        assert.deepEqual(clean(a.getSource(1, 7)), { sourcePath: "goo.js", line: 201, column: 205 });
        assert.deepEqual(clean(a.getSource(2, 0)), { sourcePath: "goo.js", line: 301, column: 302, name: "name2" });
        assert.deepEqual(clean(a.getSource(3, 0)), { sourcePath: "goo.js", line: 302, column: 0 });
        const c = new sourceMap.SourceMapBuilder();
        a.applySourceMap(c, "path");
        assert.deepEqual(clean(a.getSource(1, 1)), { sourcePath: "foo.js", line: 101, column: 99 });
        assert.deepEqual(clean(a.getSource(1, 2)), { sourcePath: "foo.js", line: 101, column: 100 });
        assert.deepEqual(clean(a.getSource(1, 3)), { sourcePath: "goo.js", line: 201, column: 202, name: "name" });
        assert.deepEqual(clean(a.getSource(1, 4)), { sourcePath: "goo.js", line: 201, column: 203 });
        assert.deepEqual(clean(a.getSource(1, 5)), { sourcePath: "goo.js", line: 201, column: 204 });
        assert.deepEqual(clean(a.getSource(1, 6)), { sourcePath: "goo.js", line: 201, column: 204 });
        assert.deepEqual(clean(a.getSource(1, 7)), { sourcePath: "goo.js", line: 201, column: 205 });
        assert.deepEqual(clean(a.getSource(2, 0)), { sourcePath: "goo.js", line: 301, column: 302, name: "name2" });
        assert.deepEqual(clean(a.getSource(3, 0)), { sourcePath: "goo.js", line: 302, column: 0 });
    }

    export function computeLinesTest() {
        const b = new sourceMap.SourceMapBuilder();
        b.addMapping(1, 1, "a.js", 101, 101);
        b.addMapping(3, 1, "a.js", 201, 201);
        assert.equal(b.mappings.length, 4);
        assert.equal(b.mappings[0], undefined);
        assert.deepEqual(b.mappings[1], [
            { column: 1, sourceIndex: 0, sourceLine: 101, sourceColumn: 101 }
        ]);
        assert.equal(b.mappings[2], undefined);
        assert.deepEqual(b.mappings[3], [
            { column: 1, sourceIndex: 0, sourceLine: 201, sourceColumn: 201 }
        ]);
        b.computeLines();
        assert.deepEqual(b.mappings[0], []);
        assert.deepEqual(b.mappings[2], [
            { column: 0, sourceIndex: 0, sourceLine: 102, sourceColumn: 0 }
        ]);
        assert.deepEqual(b.mappings[3], [
            { column: 0, sourceIndex: 0, sourceLine: 103, sourceColumn: 0 },
            { column: 1, sourceIndex: 0, sourceLine: 201, sourceColumn: 201 }
        ]);
    }

    export function emitSourceMapUrlTest() {
        assert.equal(sourceMap.emitSourceMapUrl("", "a.js"), "\n/*# sourceMappingURL=a.js */");
        assert.equal(sourceMap.emitSourceMapUrl("a", "a.js"), "a\n/*# sourceMappingURL=a.js */");
        assert.equal(sourceMap.emitSourceMapUrl("a", "a.js", true), "a\n//# sourceMappingURL=a.js");
        assert.equal(sourceMap.emitSourceMapUrl("/*# sourceMappingURL=b.js */", "a.js"), "/*# sourceMappingURL=a.js */");
        assert.equal(sourceMap.emitSourceMapUrl("//# sourceMappingURL=b.js", "a.js", true), "//# sourceMappingURL=a.js");
        assert.equal(sourceMap.emitSourceMapUrl("//@ sourceMappingURL=b.js", "a.js", true), "//# sourceMappingURL=a.js");
        assert.equal(sourceMap.emitSourceMapUrl("//@ sourceMappingURL=b.js", ""), "");
    }

}
