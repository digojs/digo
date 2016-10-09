import * as assert from "assert";
import then = require("../../lib/builder/then");

export namespace progressTest {

    export function beginAsyncAndEndAsyncTest(done: MochaDone) {
        then.progress = false;
        then.endAsync(then.beginAsync());
        then.async(() => { done(); })();
    }

    export function thenTest(done: MochaDone) {
        let c = 0;
        then.progress = false;
        then.then(() => {
            assert.equal(++c, 1);
            const id = then.beginAsync();
            setTimeout(() => {
                then.endAsync(id);
            }, 7);
        });
        then.then(() => {
            assert.equal(++c, 2);
        });
        then.then(() => {
            assert.equal(++c, 3);
            done();
        });
    }

}