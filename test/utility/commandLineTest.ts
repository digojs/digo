import * as assert from "assert";
import * as commandLine from "../../lib/utility/commandLine";

export namespace commandLineTest {

    export function parseArgsTest() {
        assert.deepEqual(commandLine.parseArgs([]), {});
        assert.deepEqual(commandLine.parseArgs(["", ""]), {});
        assert.deepEqual(commandLine.parseArgs(["", "", "foo"]), { 0: "foo" });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "goo"]), { 0: "foo", 1: "goo" });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key", "goo"]), { 0: "foo", key: "goo" });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key", "goo", "--key2", "hoo"]), { "0": "foo", "key": "goo", "key2": "hoo" });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key", "--key2", "hoo"]), { "0": "foo", "key": true, "key2": "hoo" });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key", "--key2", "hoo", "--key2", "koo"]), { "0": "foo", "key": true, "key2": ["hoo", "koo"] });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key", "--key2", "hoo", "--key2", "koo", "--key2", "foo"]), { "0": "foo", "key": true, "key2": ["hoo", "koo", "foo"] });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key-my"]), { 0: "foo", keyMy: true });
        assert.deepEqual(commandLine.parseArgs(["", "", "foo", "--key", "foo", "--key"]), { 0: "foo", key: "foo" });
    }

}
