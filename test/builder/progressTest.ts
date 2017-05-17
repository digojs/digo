import * as assert from "assert";
import * as progress from "../../lib/builder/progress";
import * as consoleHelper from "../helper/consoleHelper";

export namespace progressTest {

    export function progressTest() {
        consoleHelper.redirectOutput(() => {
            progress.end(progress.begin("foo..."));
        });
    }

}
