import * as assert from "assert";
import * as http from "http";
import * as httpServer from "../../lib/utility/httpServer";

export namespace httpServerTest {

    export function httpServerTest(done: MochaDone) {
        const server = new httpServer.HttpServer();
        assert.strictEqual(server.isListening, false);
        server.on("request", (req, res) => {
            res.end("hello");
        });
        server.on("start", () => {
            assert.strictEqual(server.isListening, true);
            http.get(server.url, res => {
                res.on("data", chunk => {
                    assert.strictEqual(chunk.toString(), "hello");
                    server.close(() => {
                        done();
                    });
                });
            });
        });
        server.listen();
    }

}
