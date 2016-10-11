import * as assert from "assert";
import * as nfs from "fs";
import then = require("../../lib/builder/then");
import * as file from "../../lib/builder/file";
import * as fileList from "../../lib/builder/fileList";

export namespace fileListTest {

    const progress = then.progress;
    export function before() {
        then.progress = false;
    }

    export function after() {
        then.progress = progress;
    }

    export function pipeTest(done: MochaDone) {

        const list = new fileList.FileList();
        list.pipe((file) => {
            file.content = "1";
        }).pipe((file, options) => {
            assert.equal(file.content, "1");
            assert.equal(options, 1);
        }, 1).pipe((file, options, done) => {
            process.nextTick(() => {
                file.content = "2";
                done();
            });
        }).pipe((file, options, done, src) => {
            assert.equal(file.content, "2");
            process.nextTick(() => {
                file.content = "3";
                done();
            });
        }).pipe((file, options, done, src, dest) => {
            assert.equal(file.content, "3");
            file.content = "4";
            dest.add(file);
            done();
        }).pipe((file, options, done, src, dest) => {
            assert.equal(file.content, "4");
            file.content += "5";
            dest.add(file);
            dest.end();
            done();
        }).pipe(file => {
            assert.equal(file.content, "45");
            done();
        });
        list.add(new file.File());
        list.end();
    }

    export function concatTest(done: MochaDone) {
        const foo = new fileList.FileList();
        const goo = new fileList.FileList();
        const concat = foo.concat(goo);
        concat.on("end", () => {
            done();
        });
        foo.end();
        goo.end();
    }

    export function destTest(done: MochaDone) {
        const list = new fileList.FileList();
        const f = new file.File("saved.txt");
        f.content = "A";
        list.add(f);
        list.end();
        list.dest("_dest_test").pipe(file => {
            assert.equal(nfs.readFileSync("_dest_test/saved.txt"), "A");
            nfs.unlinkSync("_dest_test/saved.txt");
            nfs.rmdirSync("_dest_test");
            done();
        });
    }

}
