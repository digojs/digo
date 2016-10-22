import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import * as fsHelper from "../helper/fsHelper";
import src = require("../../lib/builder/src");
import then = require("../../lib/builder/then");

export namespace srcTest {

    export function srcTest(done: MochaDone) {
        fsHelper.init();
        consoleHelper.redirectOutput((outputs, cb) => {
            src.src(fsHelper.root + "/file.txt").pipe(file => {
                assert.equal(file.content, "file.txt");
            });
            then.then(() => {
                done();
                cb();
                fsHelper.clean();
            });
        });
    }

}
