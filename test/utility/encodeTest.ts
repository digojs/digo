import * as assert from "assert";
import * as encode from "../../lib/utility/encode";

export namespace encodeTest {

    export function bufferToStringTest() {
        assert.equal(encode.bufferToString(new Buffer(0), "utf-8"), "");
        assert.equal(encode.bufferToString(new Buffer([0x66, 0x6F, 0x6F]), "utf-8"), "foo");

        assert.equal(encode.bufferToString(new Buffer(0)), "");
        assert.equal(encode.bufferToString(new Buffer([0x66, 0x6F, 0x6F])), "foo");

        assert.equal(encode.bufferToString(new Buffer([0xEF, 0xBB, 0xBF, 0x66, 0x6F, 0x6F])), "foo");
        assert.equal(encode.bufferToString(new Buffer([0xFE, 0xFF, 0x66, 0x6F, 0x6F])), "foo");
        assert.equal(encode.bufferToString(new Buffer([0xFF, 0xFE, 0x66, 0x6F, 0x6F])), "foo");
    }

    export function stringToBufferTest() {
        assert.deepEqual(encode.stringToBuffer("").toJSON().data, []);
        assert.deepEqual(encode.stringToBuffer("foo").toJSON().data, [0x66, 0x6F, 0x6F]);
        assert.equal(encode.stringToBuffer("").toString(), "");
        assert.equal(encode.stringToBuffer("foo").toString(), "foo");

        assert.deepEqual(encode.stringToBuffer("", "utf-8").toJSON().data, []);
        assert.deepEqual(encode.stringToBuffer("foo", "utf-8").toJSON().data, [0x66, 0x6F, 0x6F]);
        assert.equal(encode.stringToBuffer("", "utf-8").toString(), "");
        assert.equal(encode.stringToBuffer("foo", "utf-8").toString(), "foo");
    }

    export function base64Test() {
        assert.equal(encode.base64("foo"), "Zm9v");
        assert.equal(encode.base64(new Buffer("foo")), "Zm9v");
    }

    export function base64UriTest() {
        assert.equal(encode.base64Uri("text/javascript", "foo"), "data:text/javascript;base64,Zm9v");
        assert.equal(encode.base64Uri("text/javascript", new Buffer("foo")), "data:text/javascript;base64,Zm9v");
    }

}
