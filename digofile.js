exports.default = () => exports.build() && exports.test();

exports.build = () => exec("tsc -p tsconfig.json");

exports.watch = () => exec("tsc -p tsconfig.json -w");

exports.test = () => {
    let file = openedFile()
        .replace(/^lib\/(.*)\.ts$/, "_build/test/$1Test.js")
        .replace(/^test\/(.*)Test\.ts$/, "_build/test/$1Test.js");
    if (!/^_build\/test\//.test(file)) {
        file = "_build/test/**/*Test.js";
    }

    process.argv = [process.argv[0], process.argv[1], file, "--cwd", "test", "--ui", "exports", "--colors", "--no-timeouts", "--full-trace"];
    require("source-map-support/register");
    require("mocha/bin/_mocha");
    return true;
};

exports.coverage = () => exports.build() && exec("istanbul cover --dir _coverage node_modules/mocha/bin/_mocha _build/test/**/*Test.js -- --cwd test --ui exports --colors");

exports.coveralls = () => exec("istanbul cover --report lcovonly --dir _coverage node_modules/mocha/bin/_mocha _build/test/**/*Test.js -- --cwd test --ui exports") && exec("coveralls < ./_coverage/lcov.info") && del("_coverage");

exports.release = () => {
    del("_release");

    const fs = require("fs");

    const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json"));
    tsconfig.compilerOptions.sourceMap = false;
    tsconfig.compilerOptions.outDir = "_release";
    tsconfig.compilerOptions.declaration = true;
    tsconfig.exclude.push("test");

    fs.writeFileSync("_tsconfig_release.json", JSON.stringify(tsconfig, null, 2));
    try {
        if (!exec("tsc -p _tsconfig_release.json")) {
            return false;
        }
        del("_release/bin/digo.d.ts");
        del("_release/lib/digo.js");
    } finally {
        del("_tsconfig_release.json");
    }

    const package = JSON.parse(fs.readFileSync("package.json"));
    package.bin.digo = package.bin.digo.replace("_build/", "");
    package.main = package.main.replace("_build/", "");
    package.typings = package.typings.replace(".ts", ".d.ts");
    delete package.scripts;
    delete package.engines.npm;
    delete package.devDependencies;
    fs.writeFileSync("_release/package.json", JSON.stringify(package, null, 2));

    copy("README.md", "_release/README.md");
    copy("LICENSE", "_release/LICENSE");

    // 简单验证。
    require("./_release/");
    return true;
};

exports.install = () => exports.release() && exec("npm install . -g", {
    cwd: "_release"
});

exports.publish = () => {
    if (exports.release()) {
        exec("npm publish", {
            cwd: "_release"
        });
        const fs = require("fs");
        const package = JSON.parse(fs.readFileSync("package.json"));
        package.version = package.version.replace(/(\d+\.\d+\.)(\d+)/, (_, prefix, postfix) => prefix + (+postfix + 1));
        fs.writeFileSync("package.json", JSON.stringify(package, null, 2));
    }
};

exports.doc = () => exec("typedoc . --mode file --out _doc -p tsconfig.json --excludeNotExported --excludePrivate --ignoreCompilerErrors --exclude **/node_modules --excludeExternals --exclude **/test/**/*");

exports.clean = () => {
    del("_build");
    del("_coverage");
    del("_release");
    del("_doc");
};

function exec(command, options) {
    command = command.replace(/\bnode_modules\/(\S+)/g, (_, modulePath) => ` "${require.resolve(modulePath)}"`)
        .replace(/^(\S+)\s/, (_, cmd) => {
            try {
                const package = require.resolve((cmd === "tsc" ? "typescript" : cmd) + "/package");
                cmd = `"${process.execPath}" ${require("path").join(package, "..", require(package).bin[cmd])} `
            } catch (e) { }
            return cmd;
        });
    try {
        require("child_process").execSync(command, options);
    } catch (e) {
        if (e.stdout && e.stdout.length) {
            console.log(e.stdout.toString().trim());
        }
        if (e.stderr && e.stderr.length) {
            console.error(e.stderr.toString().trim());
        }
        return e.status === 0;
    }
    return true;
}

function openedFile() {
    const file = process.argv[3];
    return file ? require("path").relative("", file).replace(/\\/g, "/") : "";
}

function copy(from, to) {
    const fs = require("fs");
    fs.writeFileSync(to, fs.readFileSync(from));
}

function del(path) {
    const fs = require("fs");
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