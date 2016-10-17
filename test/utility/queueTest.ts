import * as assert from "assert";
import * as queue from "../../lib/utility/queue";

export namespace queueTest {

    export function enqueueTest() {
        const q = new queue.Queue();
        assert.equal(q.length, 0);
        q.enqueue(1);
        assert.equal(q.length, 1);
        q.enqueue(2);
        assert.equal(q.length, 2);
    }

    export function dequeueTest() {
        const q = new queue.Queue();
        assert.equal(q.dequeue(), undefined);
        q.enqueue(1);
        q.enqueue(2);
        q.enqueue(3);
        assert.equal(q.dequeue(), 1);
        assert.equal(q.dequeue(), 2);
        assert.equal(q.dequeue(), 3);
        assert.equal(q.dequeue(), undefined);
    }

    export function toArrayTest() {
        const q = new queue.Queue();
        q.enqueue(1);
        q.enqueue(2);
        q.enqueue(3);
        assert.deepEqual(q.toArray(), [1, 2, 3]);
        assert.deepEqual(q.toString(), [1, 2, 3].toString());
    }

    export function forOfTest() {
        const q = new queue.Queue();
        q.enqueue(1);
        q.enqueue(2);
        q.enqueue(3);
        var arr = [];
        for(const item of q) {
            arr.push(item);
        }
        assert.deepEqual(arr, [1, 2, 3]);
    }

}