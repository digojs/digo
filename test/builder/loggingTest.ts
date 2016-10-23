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

    export function logEntryMessageTest() {
        assert.equal(new logging.LogEntry(undefined).message, "");
        assert.equal(new logging.LogEntry("Sample Error").message, "Sample Error");
        assert.equal(new logging.LogEntry(new String("Sample Error")).message, "Sample Error");
        assert.equal(new logging.LogEntry(new Error("Sample Error")).message, "Sample Error");
        assert.equal(new logging.LogEntry({ message: "Sample Error", path: "foo.js" }).message, "Sample Error");
    }

    export function logEntryToStringTest() {
        assert.equal(new logging.LogEntry(undefined).toString(), "");
        assert.equal(new logging.LogEntry("Sample Error").toString(), "Sample Error");
        assert.equal(new logging.LogEntry(new String("Sample Error")).toString(), "Sample Error");
        assert.ok(new logging.LogEntry(new Error("Sample Error")).toString());
        assert.equal(new logging.LogEntry({ message: "Sample Error", path: "foo.js" }).toString(), "foo.js: Sample Error");
        assert.equal(new logging.LogEntry({ message: "Sample Error", path: "foo.js", startLine: 0 }).toString(), "foo.js(1): Sample Error");
        assert.equal(new logging.LogEntry({ message: "Sample Error", path: "foo.js", startLine: 0, startColumn: 0 }).toString(), "foo.js(1,0): Sample Error");
        assert.equal(new logging.LogEntry({ message: "Sample Error", plugin: "foo" }).toString(), "[foo]Sample Error");
        assert.equal(new logging.LogEntry({ message: "*".repeat(logging.maxMessageLength + 10), plugin: "foo" }).toString(), "[foo]" + "*".repeat(logging.maxMessageLength - 3) + "...");
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

        const fullPath = logging.fullPath;

        logging.fullPath = false;
        assert.equal(logging.getDisplayName("foo"), "foo");
        assert.equal(logging.getDisplayName(path.resolve("foo.jpg")), "foo.jpg");
        assert.equal(logging.getDisplayName(null), process.cwd());
        assert.equal(logging.getDisplayName(""), process.cwd());

        logging.fullPath = true;
        assert.equal(logging.getDisplayName("foo"), path.resolve("foo"));
        assert.equal(logging.getDisplayName("foo.jpg"), path.resolve("foo.jpg"));
        assert.equal(logging.getDisplayName(process.cwd() + "/foo.jpg"), path.resolve("foo.jpg"));
        assert.equal(logging.getDisplayName(null), process.cwd());
        assert.equal(logging.getDisplayName(""), process.cwd());

        logging.fullPath = fullPath;
    }

}
