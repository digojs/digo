import "source-map-support/register";
import * as assert from "assert";
import * as crypto from "../../lib/utility/crypto";

describe('encode', () => {
    it('sha1', () => {
        assert.equal(crypto.sha1("foo"), "0beec7b5ea3f0fdbc95d0dd47f3c5bc275da8a33");
    });
    it('md5', () => {
        assert.equal(crypto.md5("foo"), "acbd18db4cc2f85cedef654fccc4a4d8");
    });
});
