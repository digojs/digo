import * as assert from "assert";
import updateStatus from "../../lib/utility/statusBar";
import * as consoleHelper from "../helper/consoleHelper";

export namespace progressBarTest {

    export function updateStatusTest() {
        consoleHelper.redirectOutput(outputs => {
            updateStatus("1");
            updateStatus("2");
            updateStatus("3");
            console.log("clear");
            updateStatus("4");
            updateStatus("5");
            updateStatus(null);
            console.log("clear2");
            assert.equal(outputs.length, 9);
        });
    }

}
