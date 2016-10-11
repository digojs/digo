import digo = require("../");

export default function () {
    digo.src("../fixtures/**/*.txt")
        .pipe(file => file.content += " Hello")
        .dest("../_build/");
}
