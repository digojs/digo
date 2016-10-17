import * as assert from "assert";
import * as asyncQueue from "../../lib/utility/asyncQueue";

export namespace asyncQueueTest {

    export function thenTest(done: MochaDone) {
        let c = 0;
        const q = new asyncQueue.AsyncQueue();
        q.enqueue(done => {
            assert.equal(++c, 1);
            setTimeout(done, 7);
        });
        q.enqueue(() => {
            assert.equal(++c, 2);
        });
        q.enqueue(() => {
            assert.equal(++c, 3);
            done();
        });
    }

    export function promiseTest(done: MochaDone) {
        const q = new asyncQueue.AsyncQueue();
        let c = 0;
        q.enqueue(done => {
            setTimeout(() => {
                assert.equal(++c, 1);
                done();
            }, 7);
        });
        q.promise().then(() => {
            assert.equal(++c, 2);
            done();
        });
    }

}
