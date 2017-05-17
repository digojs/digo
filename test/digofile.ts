
export default function compile() {
    const a = digo.src("fixtures/1.js")
        .pipe(function p1(file) { file.content += "1"; })
        .pipe(function p2(file) { file.content += "2"; })
        .dest("_build");
    const b = digo.src("fixtures/2.js")
        .pipe(function p1(file) { file.content += "1"; })
        .pipe(function p2(file) { file.content += "2"; })
        .dest("_build");
}

export function watch() {
    digo.watch(compile);
}

export function server() {
    digo.startServer({
        port: 8081,
        task: compile
    });
}
