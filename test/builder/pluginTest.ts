import * as assert from "assert";
import then = require("../../lib/builder/then");
import plugin = require("../../lib/builder/plugin");

export namespace pluginTest {

    const colors = then.progress;
    export function before() {
        then.progress = false;
    }

    export function after() {
        then.progress = colors;
    }

    export function pluginTest() {
        assert.equal(plugin.plugin("typescript"), require("typescript"));
    }

}
