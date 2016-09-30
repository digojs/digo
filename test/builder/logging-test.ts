import "source-map-support/register";
import * as assert from "assert";
import * as path from "path";
import logging = require("../../lib/builder/logging");

describe("logging", () => {

    it("log", () => {
        const logs = [];
        logging.onLog = data => { logs.push(data); return false; };
        logging.log("data");
        assert.deepEqual(logs, ["data"]);
    });

    it("error", () => {
        const logs = [];
        logging.onLog = data => { logs.push(data); return false; };
        logging.error("data");
        assert.deepEqual(logs, ["data"]);
    });

    it("fatal", () => {
        const logs = [];
        logging.onLog = data => { logs.push(data); return false; };
        logging.fatal("data");
        assert.deepEqual(logs, ["data"]);
    });

    it("format", () => {
        assert.equal(logging.format("foo"), "foo");
        assert.equal(logging.format({
            fileName: "file.js",
            message: "foo",
            startLine: 2,
            startColumn: 4
        }), "file.js(3,4): foo");
    });

    it('getDisplayName', () => {
        logging.fullPath = false;
        assert.equal(logging.getDisplayName("a"), "a");
        assert.equal(logging.getDisplayName(path.resolve("cd.jpg")), "cd.jpg");

        logging.fullPath = true;
        assert.equal(logging.getDisplayName("a"), path.resolve("a"));
        assert.equal(logging.getDisplayName(process.cwd() + "/cd.jpg"), path.resolve("cd.jpg"));
        assert.equal(logging.getDisplayName("cd.jpg"), path.resolve("cd.jpg"));
    });

});
