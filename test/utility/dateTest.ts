import * as assert from "assert";
import * as date from "../../lib/utility/date";

export namespace dateTest {

    export function formatDateTest() {
        assert.ok(date.formatDate());
        assert.ok(date.formatDate(undefined, "y"));
        assert.equal(date.formatDate(new Date("2014/01/01 03:05:07")), "2014/01/01 03:05:07");
        assert.equal(date.formatDate(new Date("2014/01/01 03:05:07"), "yyMdHms"), "1411357");
        assert.equal(date.formatDate(new Date("2014/01/01 03:05:07"), "yyyy-MM-dd HH:mm:ss"), "2014-01-01 03:05:07");
        assert.equal(date.formatDate(new Date("2014/01/01 03:05:07"), "yyMMddHHmmss"), "140101030507");
        assert.equal(date.formatDate(new Date("2014/01/01 03:05:07"), "你好"), "你好");
        assert.equal(date.formatDate(new Date("2014/01/01 03:05:07"), "w"), "w");
    }

    export function formatHRTimeTest() {
        assert.equal(date.formatHRTime([0, 0]), "<0.01ms");
        assert.equal(date.formatHRTime([0, 1000]), "<0.01ms");
        assert.equal(date.formatHRTime([0, 9999]), "<0.01ms");
        assert.equal(date.formatHRTime([0, 10000]), "0.01ms");
        assert.equal(date.formatHRTime([0, 20000]), "0.02ms");
        assert.equal(date.formatHRTime([0, 100000]), "0.1ms");
        assert.equal(date.formatHRTime([0, 1000000]), "1ms");
        assert.equal(date.formatHRTime([0, 10000000]), "10ms");
        assert.equal(date.formatHRTime([0, 100000000]), "100ms");
        assert.equal(date.formatHRTime([0, 999999999]), "1000ms");
        assert.equal(date.formatHRTime([1, 0]), "1s");
        assert.equal(date.formatHRTime([1, 100000000]), "1.1s");
        assert.equal(date.formatHRTime([1, 110000000]), "1.11s");
        assert.equal(date.formatHRTime([1, 119000000]), "1.12s");
        assert.equal(date.formatHRTime([1, 306083663]), "1.31s");
        assert.equal(date.formatHRTime([1, 999999999]), "2s");
        assert.equal(date.formatHRTime([10, 0]), "10s");
        assert.equal(date.formatHRTime([60, 100000000]), "1min");
        assert.equal(date.formatHRTime([60, 999999999]), "1.02min");
        assert.equal(date.formatHRTime([120, 100000000]), "2min");
        assert.equal(date.formatHRTime([150, 100000000]), "2.5min");
        assert.equal(date.formatHRTime([200, 100000000]), "3.33min");
        assert.equal(date.formatHRTime([1500, 100000000]), "25min");
        assert.equal(date.formatHRTime([15000, 100000000]), "250min");
    }

}
