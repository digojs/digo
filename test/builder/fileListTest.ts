import * as assert from "assert";
import * as nfs from "fs";
import progress = require("../../lib/builder/progress");
import * as file from "../../lib/builder/file";
import * as fileList from "../../lib/builder/fileList";

export namespace fileListTest {

    const oldProgress = progress.progress;
    export function before() {
        progress.progress = false;
    }

    export function after() {
        progress.progress = oldProgress;
    }

    export function pipeTest(done: MochaDone) {

        const list = new fileList.FileList();
        var a = list.pipe((file) => {
            file.content = "1";
        }).pipe((file, options) => {
            assert.equal(options, 1);
            assert.equal(file.content, "1");
            file.content += "2";
        }, 1).pipe((file, options, done) => {
            assert.equal(file.content, "12");
            process.nextTick(() => {
                file.content += "3";
                done();
            });
        }).pipe((file, options, done, src, dest) => {
            assert.equal(file.content, "123");
            process.nextTick(() => {
                file.content += "4";
                done();
            });
        }).pipe({
            transform(src, dest, options) {
                assert.equal(options, 2);
                src.on("data", file => {
                    assert.equal(file.content, "1234");
                    file.content += "5";
                    dest.add(file);
                });
                src.on("end", files => {
                    dest.end();
                });
            }
        }, 2).pipe(file => {
            assert.equal(file.content, "12345");
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
