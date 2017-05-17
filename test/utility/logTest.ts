import * as assert from "assert";
import * as log from "../../lib/utility/log";

export namespace logTest {

    export function addLogColorTest() {
        assert.equal(log.addLogColor("ABCDEFG", log.ConsoleColor.red), "\u001b[31mABCDEFG\u001b[39m");
    }

    export function removeLogColorTest() {
        assert.equal(log.removeLogColor("ABCDEFG"), "ABCDEFG");
        assert.equal(log.removeLogColor("\u001b[37mABCDEFG\u001b[39m"), "ABCDEFG");
    }

    export function formatLogTest() {
        assert.equal(log.formatLog("A", {}), "A");
        assert.equal(log.formatLog("\u001b[37mA\u001b[39m", {}), "\u001b[37mA\u001b[39m");

        assert.equal(log.formatLog("{A}", {}), "A");
        assert.equal(log.formatLog("{red:A}", {}), "\u001b[31mA\u001b[39m");

        assert.equal(log.formatLog("abc{bright:a}", { a: 1, b: 2 }), "abc\u001b[1m1\u001b[0m");
        assert.equal(log.formatLog("abc{red:a}", { a: 1, b: 2 }), "abc\u001b[31m1\u001b[39m");

        assert.equal(log.formatLog("{a}", { a: "A" }), "A");
        assert.equal(log.formatLog("{a}{b}", { a: "A", b: "B" }), "AB");
        assert.equal(log.formatLog("{0}{1}", ["A", "B"]), "AB");
    }

    export function ellipsisLogTest() {
        assert.equal(log.ellipsisLog("ABCDEFG"), "ABCDEFG");
        assert.equal(log.ellipsisLog("ABCDEFG", 1), "");
        assert.equal(log.ellipsisLog("ABCDEFG", 2), ".");
        assert.equal(log.ellipsisLog("ABCDEFG", 3), "..");
        assert.equal(log.ellipsisLog("ABCDEFG", 4), "...");
        assert.equal(log.ellipsisLog("ABCDEFG", 5), "A...");
        assert.equal(log.ellipsisLog("ABCDEFG", 6), "A...G");
        assert.equal(log.ellipsisLog("ABCDEFG", 7), "AB...G");
        assert.equal(log.ellipsisLog("ABCDEFG", 8), "AB...FG");
        assert.equal(log.ellipsisLog("ABCDEFG", 9), "ABC...FG");
        assert.equal(log.ellipsisLog("ABCDEFG", 10), "ABCDEFG");
        assert.equal(log.ellipsisLog("ABCDEFG", 11), "ABCDEFG");
        assert.equal(log.ellipsisLog("ABCDEFG", 12), "ABCDEFG");
        assert.equal(log.ellipsisLog("ABCDEFG", 13), "ABCDEFG");

        assert.equal(log.ellipsisLog("你A好B世C界D", 4), "...");
        assert.equal(log.ellipsisLog("你A好B世C界D", 5), "...");
        assert.equal(log.ellipsisLog("你A好B世C界D", 6), "你...");
        assert.equal(log.ellipsisLog("你A好B世C界D", 7), "你...D");
        assert.equal(log.ellipsisLog("你A好B世C界D", 8), "你A...D");
        assert.equal(log.ellipsisLog("你A好B世C界D", 9), "你A...D");
        assert.equal(log.ellipsisLog("你A好B世C界D", 10), "你A...界D");
        assert.equal(log.ellipsisLog("ABCDEFG好", 8), "AB...好");

        assert.equal(log.ellipsisLog("\u001b[37mABCDEFG\u001b[39m", 6), "\u001b[37mA...G\u001b[39m");
        assert.equal(log.ellipsisLog("\u001b[37mABCDEFG好\u001b[39m", 8), "\u001b[37mAB...好\u001b[39m");
        assert.equal(log.ellipsisLog("\u001b[37mABCDEFG\u001b[39m", 13), "\u001b[37mABCDEFG\u001b[39m");
        assert.equal(log.ellipsisLog("\u001b[37m你A好B世C界D", 4), "\u001b[37m...");
        assert.equal(log.ellipsisLog("你\u001b[37mA好B世C界D", 5), "\u001b[37m...");
        assert.equal(log.ellipsisLog("你\u001b[37mA好\u001b[39mB世C界D", 5), "\u001b[37m\u001b[39m...");
    }

    export function splitLogTest() {
        assert.deepEqual(log.splitLog("ABCDEFG"), ["ABCDEFG"]);
        assert.deepEqual(log.splitLog("ABCDEFG", 1), ["A", "B", "C", "D", "E", "F", "G"]);
        assert.deepEqual(log.splitLog("你好世界", 1), ["你", "好", "世", "界"]);
        assert.deepEqual(log.splitLog("ABCDEFG", 5), ["ABCD", "EFG"]);
        assert.deepEqual(log.splitLog("你好世界", 5), ["你好", "世界"]);
        assert.deepEqual(log.splitLog("你好A世界", 5), ["你好", "A世", "界"]);
        assert.deepEqual(log.splitLog("你好世界", 12), ["你好世界"]);
        assert.deepEqual(log.splitLog("你好世界A", 12), ["你好世界A"]);

        assert.deepEqual(log.splitLog("hello world", 5), ["hell", "o", "worl", "d"]);
        assert.deepEqual(log.splitLog("hello world", 6), ["hello", "world"]);
        assert.deepEqual(log.splitLog("hello world", 7), ["hello", "world"]);
        assert.deepEqual(log.splitLog("hello world", 8), ["hello", "world"]);

        assert.deepEqual(log.splitLog("\u001b[37mABCDEFG\u001b[39m", 5), ["\u001b[37mABCD", "EFG\u001b[39m"]);
    }

    export function formatSourceTest() {
        assert.equal(log.formatSource("A", 0, 0, false, false, 0), "A");
        assert.equal(log.formatSource("A", 15, 0, true, true, 0, 0).trim(), `
 > 1 | A
     | ^`.trim());
        assert.equal(log.formatSource("\0\tA\r\n\tB\n\tC", 15, 0, true, true, 1, 1).trim(), `
   1 | \0    A
 > 2 |     B
     |     ^
   3 |     C`.trim());
        assert.equal(log.formatSource("A\r\nB\nC", 15, 0, true, true, 1, 0).trim(), `
   1 | A
 > 2 | B
     | ^
   3 | C`.trim());
        assert.equal(log.formatSource("A\rBCDEF\nC", 15, 0, true, true, 1, 2).trim(), `
   1 | A
 > 2 | BCDEF
     |   ^
   3 | C`.trim());
        assert.equal(log.formatSource("A\nBCDEF\nC", 15, 0, true, true, 1, 2, 1, 3).trim(), `
   1 | A
 > 2 | BCDEF
     |   ~
   3 | C`.trim());
        assert.equal(log.formatSource("A\nBC你EF\nC", 15, 0, true, true, 1, 2, 1, 3).trim(), `
   1 | A
 > 2 | BC你EF
     |   ~~
   3 | C`.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, true, true, 1, 2, 1, 9).trim(), `
   1 | A
 > 2 | BCDE
     |   ~~
   3 | C`.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, true, true, 1, 6, 1, 6).trim(), `
   1 | 
 > 2 | FGH
     |   ^
   3 | `.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, true, true, 1, 5, 1, 6).trim(), `
   1 | 
 > 2 | EFGH
     |   ~
   3 | `.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, true, true, 1, 4, 1, 6).trim(), `
   1 | 
 > 2 | DEFG
     |   ~~
   3 | `.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, true, true, 1, 3, 1, 6).trim(), `
   1 | 
 > 2 | CDEF
     |   ~~
   3 | `.trim());
        assert.equal(log.formatSource("A\nBCD你GH\nC", 12, 0, true, true, 1, 3, 1, 6).trim(), `
   1 | 
 > 2 | D你G
     |  ~~~
   3 | `.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, true, false, 1, 2, 1, 9).trim(), `
   1 | A
 > 2 | BCDE
   3 | C`.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 2, true, false, 1, 2, 1, 9).trim(), `
 > 2 | BCDE
   3 | C`.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 1, true, false, 1, 2, 1, 9).trim(), `
 > 2 | BCDE`.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 0, false, true, 1, 2, 1, 9).trim(), `
A
BCDEF
  ~~~
C`.trim());
        assert.equal(log.formatSource("A\nBCDEFGH\nC", 12, 1, false, true, 1, 2, 1, 9).trim(), `
BCDEF
  ~~~
`.trim());
    }

}
