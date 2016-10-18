
exports.default = exports.build = function () {
    exports.compile() && exports.test();
};

exports.compile = function () {
    return exec("node " + require.resolve("typescript/bin/tsc") + " -p tsconfig.json") === 0;
};

exports.watch = function () {
    return exec("node " + require.resolve("typescript/bin/tsc") + " -p tsconfig.json -w") === 0;
};

exports.test = function () {
    var file = (process.argv[3] || "").substr(process.cwd().length + 1)
        .replace(/\\/g, "/")
        .replace(/^lib\/(.*)\.ts$/, "_build/test/$1Test.js")
        .replace(/^test\/(.*)Test\.ts$/, "_build/test/$1Test.js");
    if (!/^_build\/test\//.test(file)) {
        file = "_build/test/**/*Test.js";
    }

    process.argv.length = 2;
    process.argv.push(file, "--no-timeouts", "--colors", "--ui", "exports", "--full-trace");

    require("source-map-support/register");
    require("mocha/bin/_mocha");
};

exports.coverage = function () {
    if (exports.compile()) {
        return exec("node " + require.resolve("istanbul/lib/cli.js") + " cover --dir _coverage " + require.resolve("mocha/bin/_mocha") + " _build/test/**/*Test.js -- --ui exports") === 0;
    }
};

exports.coveralls = function () {
    return exec("node " + require.resolve("istanbul/lib/cli.js") + " cover --report lcovonly --dir _coverage " + require.resolve("mocha/bin/_mocha") + " _build/test/**/*Test.js -- --ui exports") === 0 &&
        exec("node " + require.resolve("coveralls/bin/coveralls.js") + " < ./_coverage/lcov.info") === 0 &&
        del("_coverage");
};

exports.dist = function () {

    del("_dist");

    var tsconfig = require("./tsconfig");
    tsconfig.compilerOptions.sourceMap = false;
    tsconfig.compilerOptions.outDir = "_dist";
    tsconfig.compilerOptions.declaration = true;
    tsconfig.exclude.push("test");

    var fs = require("fs");
    fs.writeFileSync("_dist_tsconfig.json", JSON.stringify(tsconfig));
    try {
        if (exec("node " + require.resolve("typescript/bin/tsc") + " -p _dist_tsconfig.json") !== 0) {
            return;
        }
    } finally {
        fs.unlinkSync("_dist_tsconfig.json");
    }

    var package = require("./package.json");
    package.main = package.main.replace("_build/", "");
    package.typings = package.typings.replace(".ts", ".d.ts");
    package.bin.digo = package.bin.digo.replace("_build/", "");
    delete package.scripts;
    delete package.dependencies;
    delete package.devDependencies;
    fs.writeFileSync("_dist/package.json", JSON.stringify(package, null, 2));

    copy("README.md", "_dist/README.md");
    copy("LICENSE", "_dist/LICENSE");

    try {
        require("./dist/");
    } catch (e) {
        return;
    }

};

exports.publish = function () {
    var prd = process.argv[3] === "prd";
    exports.dist();
    if (!prd) {
        exec("npm publish --tag dev-" + require("./_build/lib/utility/date").formatDate(undefined, "yyyyMMdd"), { cwd: "_dist" });
    } else {
        exec("npm publish", { cwd: "_dist" });
        var package = require("./package.json");
        package.version = package.version.replace(/(\d+\.\d+\.)(\d+)/, function (_, prefix, postfix) {
            return prefix + (+postfix + 1);
        });
        fs.writeFileSync("package.json", JSON.stringify(package, null, 2));
    }


};

exports.preinstall = function () {
    var fs = require("fs");
    if (!fs.existsSync("./_build/bin/digo.js")) {
        fs.mkdirSync("./_build");
        fs.mkdirSync("./_build/bin");
        fs.writeFileSync("./_build/bin/digo.js", "#!/usr/bin/env node\nrequire('digo/_build/bin/digo')");
    }
};

exports.doc = function () {
    exec("node " + require.resolve("typedoc/bin/typedoc") + " . --mode file --out _doc -p tsconfig.json --excludeNotExported --excludePrivate --ignoreCompilerErrors --theme ../typedoc-default-themes/bin/default --exclude **/node_modules --excludeExternals --exclude **/test/**/*");
};

exports.clean = function () {
    del("_build");
    del("_coverage");
    del("_dist");
    del("_doc");
};

function exec(command, options) {
    try {
        require("child_process").execSync(command, options);
    } catch (e) {
        if (e.stdout && e.stdout.length) {
            console.log(e.stdout.toString().trim());
        }
        if (e.stderr && e.stderr.length) {
            console.error(e.stderr.toString().trim());
        }
        return e.status;
    }
    return 0;
}

function copy(from, to) {
    var fs = require("fs");
    fs.writeFileSync(to, fs.readFileSync(from));
}

function del(dir) {
    var fs = require("fs");
    try {
        fs.unlinkSync(path);
    } catch (e) { }
    try {
        fs.readdirSync(path).forEach(name => {
            del(path + "/" + name);
        });
    } catch (e) { }
    try {
        fs.rmdirSync(path);
    } catch (e) { }
}

if (process.mainModule === module) {
    exports[process.argv[2] || "default"]();
}
