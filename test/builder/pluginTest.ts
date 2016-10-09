import * as assert from "assert";
import plugin = require("../../lib/builder/plugin");

export namespace pluginTest {

    export function pluginTest() {
        assert.equal(plugin.plugin("typescript"), require("typescript"));
    }

}
