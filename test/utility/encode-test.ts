import "source-map-support/register";
import * as assert from "assert";
import * as encode from "../../lib/utility/encode";

describe('encode', () => {
    it('bufferToString', () => {
        assert.equal(encode.bufferToString(new Buffer(0), "utf-8"), "");
        assert.equal(encode.bufferToString(new Buffer([0x66, 0x6F, 0x6F]), "utf-8"), "foo");

        assert.equal(encode.bufferToString(new Buffer(0)), "");
        assert.equal(encode.bufferToString(new Buffer([0x66, 0x6F, 0x6F])), "foo");

        assert.equal(encode.bufferToString(new Buffer([0xEF, 0xBB, 0xBF, 0x66, 0x6F, 0x6F])), "foo");
        assert.equal(encode.bufferToString(new Buffer([0xFE, 0xFF, 0x66, 0x6F, 0x6F])), "foo");
        assert.equal(encode.bufferToString(new Buffer([0xFF, 0xFE, 0x66, 0x6F, 0x6F])), "foo");
    });
    it('stringToBuffer', () => {
        assert.deepEqual(encode.stringToBuffer("").toJSON().data, []);
        assert.deepEqual(encode.stringToBuffer("foo").toJSON().data, [0x66, 0x6F, 0x6F]);
        assert.equal(encode.stringToBuffer("").toString(), "");
        assert.equal(encode.stringToBuffer("foo").toString(), "foo");

        assert.deepEqual(encode.stringToBuffer("", "utf-8").toJSON().data, []);
        assert.deepEqual(encode.stringToBuffer("foo", "utf-8").toJSON().data, [0x66, 0x6F, 0x6F]);
        assert.equal(encode.stringToBuffer("", "utf-8").toString(), "");
        assert.equal(encode.stringToBuffer("foo", "utf-8").toString(), "foo");
    });
    it('base64', () => {
        assert.equal(encode.base64("foo"), "Zm9v");
    });
    it('base64Uri', () => {
        assert.equal(encode.base64Uri("text/javascript", "foo"), "data:text/javascript;base64,Zm9v");
    });
});
