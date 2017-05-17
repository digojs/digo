import * as assert from "assert";
import * as events from "../../lib/builder/events";

export namespace eventsTest {

    export function eventsTest() {
        events.on("my-event", (e: any) => assert.equal(e, 1));
        events.emit("my-event", 1);

        events.off("my-event");
        events.emit("my-event", 2);

        events.on("my-event", (e: any) => assert.equal(e, 1));
        events.off();
        events.emit("my-event", 2);

        const func = (e: any) => assert.equal(e, 1);
        events.on("my-event", func);
        events.off("my-event", func);
        events.emit("my-event", 2);
    }

}
