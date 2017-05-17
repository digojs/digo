import * as assert from "assert";
import * as requireHelper from "../../lib/utility/require";
import * as fsHelper from "../helper/fsHelper";

export namespace requireTest {

    export function addRequirePathTest() {
        fsHelper.init({ "_addRequirePathTest.js": "module.exports = 1;" });
        try {
            requireHelper.addRequirePath(fsHelper.root);
            assert.equal(require("_addRequirePathTest"), 1);
        } finally {
            fsHelper.uninit();
        }
    }

    export function resolveRequireTest() {
        assert.equal(requireHelper.resolveRequirePath("typescript"), require.resolve("typescript"));
        assert.equal(requireHelper.resolveRequirePath(require.resolve("typescript")), require.resolve("typescript"));
        fsHelper.init({});
        try {
            assert.equal(requireHelper.resolveRequirePath("typescript"), require.resolve("typescript"));
        } finally {
            fsHelper.uninit();
        }
    }

}
