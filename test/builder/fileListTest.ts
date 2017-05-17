import * as assert from "assert";
import * as file from "../../lib/builder/file";
import * as fileList from "../../lib/builder/fileList";
import * as funcHelper from "../helper/funcHelper";
import progress = require("../../lib/builder/progress");

export namespace fileListTest {

    class MyFile extends file.File {
        myName: string;
        constructor(name: string) {
            super(name);
            this.myName = name;
        }
        get loaded() { return true; }
        myData: string[] = [];
        clone() {
            const result: MyFile = super.clone() as MyFile;
            result.myData = result.myData.slice(0);
            return result;
        }
    }

    const oldProgress = progress.progress;
    export function before() {
        progress.progress = false;
    }

    export function after() {
        progress.progress = oldProgress;
    }

    export function pipeAddTest(done: MochaDone) {
        const a = new fileList.FileList();
        const b = a.pipe({
            add(file: MyFile, options, done) {
                assert.equal(options, 1);
                file.myData.push("a->b");
                setTimeout(done, 4);
            }
        }, 1);
        const c = b.pipe({
            add(file: MyFile, options, done) {
                file.myData.push("b->c");
                setTimeout(done, 3);
            }
        });
        const d = b.pipe({
            add(file: MyFile, options, done) {
                file.myData.push("b->d");
                setTimeout(done, 2);
            }
        });
        const e = d.pipe({
            add(file: MyFile, options, done) {
                file.myData.push("d->e");
                setTimeout(done, 1);
            }
        });
        const f = a.pipe({
            add(file: MyFile, options, done) {
                file.myData.push("a->f");
                setTimeout(done, 1);
            }
        });
        const g = a.pipe({
            add(file: MyFile, options, done) {
                file.myData.push("a->g");
                setTimeout(done, 1);
            }
        });
        const h = f.pipe({
            add(file: MyFile, options, done) {
                file.myData.push("f->h");
                setTimeout(done, 1);
            }
        });
        assert.equal(a.root, a);
        assert.equal(h.root, a);
        assert.equal(a.result, h);
        assert.equal(h.result, h);
        a.then(() => {
            assert.deepEqual(f1.myData, [
                "a->b",
                "b->c",
                "b->d",
                "d->e",
                "a->f",
                "a->g",
                "f->h"
            ]);
            done();
        });

        const f1 = new MyFile("");
        a.add(f1);
        a.end();
    }

    export function pipeEndTest(done: MochaDone) {
        const a = new fileList.FileList();
        const b = a.pipe({
            name: "b",
            add(file: MyFile, options, done) {
                file.myData.push("a->b");
                assert.deepEqual(file.myData, [
                    "a->b"
                ]);
                setTimeout(done, 4);
            }
        });
        const c = b.pipe({
            name: "c",
            add(file: MyFile, options, done) {
                file.myData.push("b->c");
                assert.deepEqual(file.myData, [
                    "a->b",
                    "b->c"
                ]);
                setTimeout(done, 3);
            }
        });
        const d = b.pipe({
            name: "d",
            end(files: MyFile[], options, result, done) {
                files[0].myData.push("b->d");
                assert.deepEqual(files[0].myData, [
                    "a->b",
                    "b->c",
                    "b->d"
                ]);
                result.add(files[0]);
                setTimeout(done, 2);
            }
        });
        const e = d.pipe({
            name: "e",
            add(file: MyFile, options, done) {
                file.myData.push("d->e");
                assert.deepEqual(file.myData, [
                    "a->b",
                    "b->c",
                    "b->d",
                    "d->e"
                ]);
                setTimeout(done, 1);
            }
        });
        const f = a.pipe({
            name: "f",
            add(file: MyFile, options, done) {
                file.myData.push("a->f");
                assert.deepEqual(file.myData, [
                    "a->b",
                    "b->c",
                    "a->f"
                ]);
                setTimeout(done, 1);
            }
        });
        const g = a.pipe({
            name: "g",
            end(files: MyFile[], options, result) {
                files[0].myData.push("a->g");
                assert.deepEqual(files[0].myData, [
                    "a->b",
                    "b->c",
                    "a->f",
                    "a->g"
                ]);
            }
        });
        const h = f.pipe({
            name: "h",
            add(file: MyFile, options, done) {
                file.myData.push("f->h");
                setTimeout(done, 1);
            }
        });
        const i = h.pipe({
            name: "i",
            collect: false,
            end(files: MyFile[], options, result, done) {
                f1.myData.push("h->i");
                setTimeout(done, 1);
            }
        });
        const cb = funcHelper.skip(() => {
            assert.deepEqual(f1.myData, [
                "a->b",
                "b->c",
                "a->f",
                "f->h",
                "h->i"
            ]);
            done();
        }, 5);
        c.then(cb);
        e.then(cb);
        g.then(cb);
        h.then(cb);
        i.then(cb);

        const f1 = new MyFile("file.js");
        a.add(f1);
        a.end();
    }

    export function pipeInitTest(done: MochaDone) {
        const a = new fileList.FileList();
        const b = a.pipe({
            init(options) {
                assert.equal(options, 1);
                return options;
            }
        }, 1);
        b.then(() => {
            done();
        });
        a.add(new MyFile("file.js"));
        a.end();
    }

    export function pipeLoadTest(done: MochaDone) {
        const a = new fileList.FileList();
        const b = a.pipe({
            load: true
        }, 1);
        b.then(() => {
            done();
        });
        a.add(new MyFile("file.js"));
        a.end();
    }

    export function pipeWatchTest(done: MochaDone) {
        const a = new fileList.FileList();
        const b = a.pipe({
            end(files: MyFile[]) {
                assert.equal(files[0].myName, "f1.js");
                assert.equal(files[1].myName, "f2.js");
            }
        }, 1);
        const f1 = new MyFile("f1.js");
        const f2 = new MyFile("f2.js");

        a.then(funcHelper.step(() => {
            a.add(f1);
            a.end();
        }, done));
        a.add(f1);
        a.add(f2);
        a.end();
    }

    export function srcTest(done: MochaDone) {
        const a = new fileList.FileList();
        const b = a.src("f1.js").pipe({
            add(file: MyFile, options, done) {
                file.myData.push("a->b");
                setTimeout(done, 4);
            }
        });
        const c = b.src("f1.js").pipe({
            add(file: MyFile, options, done) {
                file.myData.push("b->c");
                setTimeout(done, 3);
            }
        });
        const d = b.src("f2.js").pipe({
            add(file: MyFile, options, done) {
                file.myData.push("b->d");
                setTimeout(done, 2);
            }
        });
        const e = d.src("f1.js").pipe({
            add(file: MyFile, options, done) {
                file.myData.push("d->e");
                setTimeout(done, 1);
            }
        });
        const f = b.pipe({
            add(file: MyFile, options) {
                file.myData.push("a->f");
            }
        });
        const g = b.pipe({
            end(files: MyFile[], options, result) {
                files[0].myData.push("a->g");
                result.add(files[0]);
            }
        });
        const h = b.src("f1.js").pipe({
            add(file: MyFile, options) {
                file.myData.push("a->h");
            }
        });
        const cb = funcHelper.skip(() => {
            assert.deepEqual(f1.myData, [
                "a->b",
                "b->c",
                "a->f",
                "a->h"
            ]);
            done();
        }, 8);
        a.then(cb);
        b.then(cb);
        c.then(cb);
        d.then(cb);
        e.then(cb);
        f.then(cb);
        g.then(cb);
        h.then(cb);

        const f1 = new MyFile("f1.js");
        a.add(f1);
        a.end();
    }

}
