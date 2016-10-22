import * as assert from "assert";
import * as then from "../../lib/builder/then";

export namespace thenTest {

    export function thenTest1(done: MochaDone) {
        then.then(() => {
            done();
        });
    }

    export function thenTest2(done: MochaDone) {
        var c = 0;
        then.then(() => {
            assert.equal(++c, 1);
        });
        then.then(() => {
            assert.equal(++c, 2);
        });
        then.then(() => {
            assert.equal(++c, 3);
            done();
        });
    }

    export function thenTest3(done: MochaDone) {
        var c = 0;
        then.then(() => {
            assert.equal(++c, 1);
            then.then(() => {
                assert.equal(++c, 2);
            });
        });
        then.then(() => {
            assert.equal(++c, 3);
            done();
        });
    }

    export function thenTest4(done: MochaDone) {
        var c = 0;
        then.then(() => {
            assert.equal(++c, 1);
            then.then(() => {
                assert.equal(++c, 2);
                then.then(() => {
                    assert.equal(++c, 3);
                });
            });
            then.then(() => {
                assert.equal(++c, 4);
            });
        });
        then.then(() => {
            assert.equal(++c, 5);
            then.then(() => {
                assert.equal(++c, 6);
            });
            then.then(() => {
                assert.equal(++c, 7);
                done();
            });
        });
    }

    for (const key in thenTest) {
        thenTest[key + "WithLock"] = (done: MochaDone) => {
            then.asyncQueue.lock();
            thenTest[key](done);
            setTimeout(() => {
                then.asyncQueue.unlock();
            }, 1);
        };
    }

}