import * as assert from "assert";
import * as async from "../../lib/builder/async";

export namespace asyncTest {

    export function thenTest1(done: MochaDone) {
        async.then(() => {
            done();
        });
    }

    export function thenTest2(done: MochaDone) {
        var c = 0;
        async.then(() => {
            assert.equal(++c, 1);
        });
        async.then(() => {
            assert.equal(++c, 2);
        });
        async.then(() => {
            assert.equal(++c, 3);
            done();
        });
    }

    for (const key in asyncTest) {
        (asyncTest as any)[key + "WithLock"] = (done: MochaDone) => {
            async.asyncQueue.lock();
            (asyncTest as any)[key](done);
            setTimeout(() => {
                async.asyncQueue.unlock();
            }, 1);
        };
    }

}
