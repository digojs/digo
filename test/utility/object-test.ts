import "source-map-support/register";
import * as assert from "assert";
import * as object from "../../lib/utility/object";

describe('object', () => {
    it("setProp", () => {
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
    });
});
