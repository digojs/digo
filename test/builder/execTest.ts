import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import progress = require("../../lib/builder/progress");
import exec = require("../../lib/builder/exec");

export namespace execTest {

    const oldProgress = progress.progress;
    export function before() {
        progress.progress = false;
    }

    export function after() {
        progress.progress = oldProgress;
    }

    export function execTest(done: MochaDone) {
        consoleHelper.redirectOutput((outputs, cb) => {
            exec.exec("echo 1", code => {
                cb();
                assert.equal(code, 0);
                assert.deepEqual(outputs, ["1\n"]);
                done();
            });
        });
    }

    export function execSyncTest(done: MochaDone) {
        consoleHelper.redirectOutput((outputs, cb) => {
            const code = exec.exec("echo 1");
            cb();
            assert.equal(code.status, 0);
            assert.deepEqual(outputs, ["1\n"]);
            done();
        });
    }

}
