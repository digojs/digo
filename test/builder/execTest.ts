import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import then = require("../../lib/builder/then");
import exec = require("../../lib/builder/exec");

export namespace execTest {

    const colors = then.progress;
    export function before() {
        then.progress = false;
    }

    export function after() {
        then.progress = colors;
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

    export function execSyncTest() {
        consoleHelper.redirectOutput(outputs => {
            assert.equal(exec.execSync("echo 1"), 0);
            assert.deepEqual(outputs, ["1\n"]);
        });
    }

}
