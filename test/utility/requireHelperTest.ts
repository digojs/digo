import * as assert from "assert";
import * as fsHelper from "../helper/fsHelper";
import * as requireHelper from "../../lib/utility/requireHelper";

export namespace requireHelperTest {

    export function addRequirePathTest() {
        fsHelper.init({ "_addRequirePathTest.js": "module.exports = 1;" });
        requireHelper.addRequirePath(fsHelper.root);
        assert.equal(require("_addRequirePathTest"), 1);
        fsHelper.uninit();
    }

    export function resolveRequireTest() {
        assert.equal(requireHelper.resolveRequirePath("typescript"), require.resolve("typescript"));
    }

}
