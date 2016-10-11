import digo = require("../lib/");

export default function compile() {
    digo.src("fixtures/**/*.*")
        .pipe(file => file.content += "// Hello")
        .dest("_build/");
}

export function watch() {
    digo.watch(compile);
}

if ((<any>process).mainModule === module) {
    exports[process.argv[2] || "default"]();
}
