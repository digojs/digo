import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import * as progressBar from "../../lib/utility/progressBar";

export namespace progressBarTest {

    export function beforeEach() {
        consoleHelper.init();
    }

    export function afterEach() {
        consoleHelper.uninit();
    }

    export function progressBarTest() {
        progressBar.progressBar("1");
        progressBar.progressBar("2");
        progressBar.progressBar("3");
        console.log("clear");
        progressBar.progressBar("4");
        progressBar.progressBar("5");
        progressBar.progressBar(null);
        console.log("clear2");
        assert.equal(consoleHelper.outputs.length, 9);
    }

}
