import * as assert from "assert";
import * as lang from "../../lib/utility/lang";

export namespace langTest {

    export function setPropTest() {
        class A {
            get prop() { return 1; }
            set prop(value) { lang.setProperty(this, "prop", value); }
        }
        const a = new A();
        assert.equal(a.prop, 1);
        a.prop++;
        assert.equal(a.prop, 2);
        a.prop++;
        assert.equal(a.prop, 3);
    }

    export function formatDateTest() {
        assert.ok(lang.formatDate());
        assert.ok(lang.formatDate(undefined, "y"));
        assert.equal(lang.formatDate(new Date("2014/01/01 03:05:07")), "2014/01/01 03:05:07");
        assert.equal(lang.formatDate(new Date("2014/01/01 03:05:07"), "yyMdHms"), "1411357");
        assert.equal(lang.formatDate(new Date("2014/01/01 03:05:07"), "yyyy-MM-dd HH:mm:ss"), "2014-01-01 03:05:07");
        assert.equal(lang.formatDate(new Date("2014/01/01 03:05:07"), "yyMMddHHmmss"), "140101030507");
        assert.equal(lang.formatDate(new Date("2014/01/01 03:05:07"), "你好"), "你好");
        assert.equal(lang.formatDate(new Date("2014/01/01 03:05:07"), "abc"), "abc");
    }

    export function formatHRTimeTest() {
        assert.equal(lang.formatHRTime([0, 0]), "<0.01ms");
        assert.equal(lang.formatHRTime([0, 1000]), "<0.01ms");
        assert.equal(lang.formatHRTime([0, 9999]), "<0.01ms");
        assert.equal(lang.formatHRTime([0, 10000]), "0.01ms");
        assert.equal(lang.formatHRTime([0, 20000]), "0.02ms");
        assert.equal(lang.formatHRTime([0, 100000]), "0.1ms");
        assert.equal(lang.formatHRTime([0, 1000000]), "1ms");
        assert.equal(lang.formatHRTime([0, 10000000]), "10ms");
        assert.equal(lang.formatHRTime([0, 100000000]), "100ms");
        assert.equal(lang.formatHRTime([0, 999999999]), "1000ms");
        assert.equal(lang.formatHRTime([1, 0]), "1s");
        assert.equal(lang.formatHRTime([1, 100000000]), "1.1s");
        assert.equal(lang.formatHRTime([1, 110000000]), "1.11s");
        assert.equal(lang.formatHRTime([1, 119000000]), "1.12s");
        assert.equal(lang.formatHRTime([1, 306083663]), "1.31s");
        assert.equal(lang.formatHRTime([1, 999999999]), "2s");
        assert.equal(lang.formatHRTime([10, 0]), "10s");
        assert.equal(lang.formatHRTime([60, 100000000]), "1min");
        assert.equal(lang.formatHRTime([60, 999999999]), "1.02min");
        assert.equal(lang.formatHRTime([120, 100000000]), "2min");
        assert.equal(lang.formatHRTime([150, 100000000]), "2.5min");
        assert.equal(lang.formatHRTime([200, 100000000]), "3.33min");
        assert.equal(lang.formatHRTime([1500, 100000000]), "25min");
        assert.equal(lang.formatHRTime([15000, 100000000]), "250min");
    }

    export function encodeHTMLTest() {
        assert.equal(lang.encodeHTML("<=>"), "&lt;=&gt;");
    }

}
