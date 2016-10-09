import * as assert from "assert";
import * as path from "path";
import * as consoleHelper from "../helper/consoleHelper";
import logging = require("../../lib/builder/logging");

export namespace loggingTest {

    const colors = logging.colors;
    export function before() {
        logging.colors = false;
    }

    export function after() {
        logging.colors = colors;
    }

    export function messageTest() {
        assert.equal(new logging.LogEntry(undefined).message, undefined);
        assert.equal(new logging.LogEntry("Sample Error").message, "Sample Error");
        assert.equal(new logging.LogEntry(new Error("Sample Error")).message, "Sample Error");
        assert.equal(new logging.LogEntry(new String("Sample Error")).message, "Sample Error");
        assert.equal(new logging.LogEntry({ message: "Sample Error" }).message, "Sample Error");
    }

    export function logTest() {
        consoleHelper.redirectOutput(outputs => {
            logging.log("data");
            assert.deepEqual(outputs, ["data\n"]);
        });
    }

    export function errorTest() {
        consoleHelper.redirectOutput(outputs => {
            logging.error("data");
            assert.deepEqual(outputs, ["error 1: data\n"]);
        });
    }

    export function warningTest() {
        consoleHelper.redirectOutput(outputs => {
            logging.warning("data");
            assert.deepEqual(outputs, ["warning 1: data\n"]);
        });
    }

    export function fatalTest() {
        consoleHelper.redirectOutput(outputs => {
            logging.fatal("data");
            assert.deepEqual(outputs, ["fatal error: data\n"]);
        });
    }

    export function infoTest() {
        consoleHelper.redirectOutput(outputs => {
            logging.info("data");
            assert.deepEqual(outputs, ["data\n"]);
        });
    }

    export function verboseTest() {
        consoleHelper.redirectOutput(outputs => {
            logging.logLevel = logging.LogLevel.verbose;
            logging.verbose("data");
            logging.logLevel = logging.LogLevel.log;
            assert.deepEqual(outputs, ["data\n"]);
        });
    }

    export function formatTest() {
        assert.equal(logging.format("foo"), "foo");
        assert.equal(logging.format("foo{goo}", { goo: 1 }), "foo\u001b[1m1\u001b[39m");
    }

    export function getDisplayNameTest() {
        assert.equal(logging.getDisplayName(null), "");

        logging.fullPath = false;
        assert.equal(logging.getDisplayName("a"), "a");
        assert.equal(logging.getDisplayName(path.resolve("cd.jpg")), "cd.jpg");

        logging.fullPath = true;
        assert.equal(logging.getDisplayName("a"), path.resolve("a"));
        assert.equal(logging.getDisplayName(process.cwd() + "/cd.jpg"), path.resolve("cd.jpg"));
        assert.equal(logging.getDisplayName("cd.jpg"), path.resolve("cd.jpg"));
    }

}
