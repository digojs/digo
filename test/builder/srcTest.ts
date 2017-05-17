import * as assert from "assert";
import * as src from "../../lib/builder/src";
import * as consoleHelper from "../helper/consoleHelper";
import * as fsHelper from "../helper/fsHelper";

export namespace srcTest {

    export function srcTest(done: MochaDone) {
        fsHelper.init();
        consoleHelper.redirectOutput((outputs, cb) => {
            src.src("f1.txt").pipe(file => {
                assert.equal(file.content, "f1.txt");
            }).then(() => {
                cb();
                fsHelper.uninit();
                done();
            });
        });
    }

}
