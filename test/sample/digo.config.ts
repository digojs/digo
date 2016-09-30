import * as digo from "../../lib/index";

export default function () {
    digo.src("../fixtures/**/*.txt")
        .pipe(file => file.content += " Hello")
        .dest("../../../../_digo_t_build");
}
