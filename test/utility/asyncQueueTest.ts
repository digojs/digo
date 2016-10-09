import * as assert from "assert";
import * as asyncQueue from "../../lib/utility/asyncQueue";

export namespace asyncQueueTest {

    export function beginAsyncAndEndAsyncTest(done: MochaDone) {
        const q = new asyncQueue.AsyncQueue();
        q.beginAsync();
        q.endAsync();
        q.async(() => { done(); })();
    }

    export function thenTest(done: MochaDone) {
        let c = 0;
        const q = new asyncQueue.AsyncQueue();
        q.then(() => {
            assert.equal(++c, 1);
            q.beginAsync();
            setTimeout(() => {
                q.endAsync();
            }, 7);
        });
        q.then(() => {
            assert.equal(++c, 2);
        });
        q.then(() => {
            assert.equal(++c, 3);
            done();
        });
    }

    export function promiseTest(done: MochaDone) {
        const q = new asyncQueue.AsyncQueue();
        q.beginAsync();
        let c = 0;
        setTimeout(() => {
            q.endAsync();
            assert.equal(++c, 1);
        }, 7);
        q.promise().then(() => {
            assert.equal(++c, 2);
            done();
        });
    }

    export function concatTest(done: MochaDone) {
        const q1 = new asyncQueue.AsyncQueue();
        const q2 = new asyncQueue.AsyncQueue();
        const unlock1 = q1.async();
        const unlock2 = q2.async();
        let c = 0;
        setTimeout(() => {
            c++;
            unlock1();
        }, 7);
        setTimeout(() => {
            c++;
            unlock2();
        }, 7);

        asyncQueue.AsyncQueue.concat(q1, q2).then(() => {
            assert.equal(c, 2);
            done();
        });
    }

    export function concatTest2(done: MochaDone) {
        asyncQueue.AsyncQueue.concat(new asyncQueue.AsyncQueue()).then(() => {
            done();
        });
    }

    export function concatTest3(done: MochaDone) {
        asyncQueue.AsyncQueue.concat().then(() => {
            done();
        });
    }

}
