import * as assert from "assert";
import * as object from "../../lib/utility/object";

export namespace objectTest {

    export function setPropTest() {
        class A {
            get prop() { return 1; }
            set prop(value) { object.setProperty(this, "prop", value); }
        }
        const a = new A();
        assert.equal(a.prop, 1);
        a.prop++;
        assert.equal(a.prop, 2);
        a.prop++;
        assert.equal(a.prop, 3);
    }

    export function addCallbackTest() {
        class A {
            func = null;
        }
        let c = 0;
        const a = new A();
        object.addCallback(a, "func", () => {
            assert.equal(++c, 1);
        });
        object.addCallback(a, "func", () => {
            assert.equal(++c, 2);
        });
        a.func();
    }

}
