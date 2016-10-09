import * as assert from "assert";
import * as consoleHelper from "../helper/consoleHelper";
import * as progressBar from "../../lib/utility/progressBar";

export namespace progressBarTest {

    export function progressBarTest() {
        consoleHelper.redirectOutput(outputs => {
            progressBar.updateProgressBar("1");
            progressBar.updateProgressBar("2");
            progressBar.updateProgressBar("3");
            console.log("clear");
            progressBar.updateProgressBar("4");
            progressBar.updateProgressBar("5");
            progressBar.updateProgressBar(null);
            console.log("clear2");
            assert.equal(outputs.length, 9);
        });
    }

}
