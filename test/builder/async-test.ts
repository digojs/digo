import "source-map-support/register";
import * as assert from "assert";
import progress = require("../../lib/builder/progress");
import * as async from "../../lib/builder/async";

describe('async', () => {
    let oldProgress: boolean;
    before(() => {
        oldProgress = progress.progress;
        progress.progress = false;
    });
    after(() => {
        progress.progress = oldProgress;
    });
    it("then", done => {
        var c = 1;
        async.then(() => {
            assert.equal(c++, 1);
        });
        async.then(() => {
            assert.equal(c++, 2);
        });
        process.nextTick(async.async());
        async.then(() => {
            assert.equal(c++, 3);
        });
        async.then(() => {
            assert.equal(c++, 4);
            process.nextTick(async.async());
        });
        async.then(() => {
            assert.equal(c++, 5);
            done();
        });
    });
});