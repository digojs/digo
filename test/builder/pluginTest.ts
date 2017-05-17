import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import plugin = require("../../lib/builder/plugin");

export namespace pluginTest {

    export function pluginTest() {
        consoleHelper.redirectOutput(() => {
            assert.equal(plugin.plugin("typescript"), require("typescript"));
        });
    }

}
