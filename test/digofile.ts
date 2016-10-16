import _digo = require("../lib");
const digo: typeof _digo = require("digo");

export default function compile() {
    var a = digo.src("fixtures/1.js")
        .pipe(function p1(file) { file.content += "1" })
        .pipe(function p2(file) { file.content += "2" })
        .dest("_build1");
    var b = digo.src("_build1/1.js")
        .pipe(function p3(file) { file.content += "3" })
        .dest("_build2");
    var c = a.pipe(function p4(file) { file.content += "4" })
        .dest("_build3");
}

export function watch() {
    digo.watch(compile);
}

if ((<any>process).mainModule === module) {
    exports[process.argv[2] || "default"]();
}
