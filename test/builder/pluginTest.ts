import * as assert from "assert";
import progress = require("../../lib/builder/progress");
import plugin = require("../../lib/builder/plugin");

export namespace pluginTest {

    const oldProgress = progress.progress;
    export function before() {
        progress.progress = false;
    }

    export function after() {
        progress.progress = oldProgress;
    }

    export function pluginTest() {
        assert.equal(plugin.plugin("typescript"), require("typescript"));
    }

}
