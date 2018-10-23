#!/usr/bin/env node
import * as _child_process from "child_process";
import * as nfs from "fs";
import * as np from "path";
import * as _url from "url";
import * as _digo from "../lib/index";

main();

/**
 * 命令行入口。
 */
function main() {

    // 优先执行本地安装的版本。
    const localCli = searchFile(["node_modules/digo/bin/digo.js"]);
    if (localCli && localCli !== __filename && require(localCli) !== exports) {
        return;
    }

    // 调试模式：异步执行以确保所有 debugger 正常中断。
    const debugging = process.execArgv.some(RegExp.prototype.test, /^\-\-(?:debug|inspect)/);
    if (debugging && !arguments[0]) {
        return setImmediate(main, true);
    }

    const digo: typeof _digo = require("../lib/index");
    const configs: [keyof _digo.Config, any][] = [];
    let digoFile: string | undefined;
    let cwd: string | undefined;

    // 设置退出码。
    process.env["INIT_CWD"] = process.cwd();
    process.once("exit", (code: number) => {
        if (code === 0 && digo.errorCount) {
            process.exit(1);
        }
    });

    // 定义所有命令行参数。
    const options = {

        // #region 全局指令

        "-v": "--version",
        "-V": "--version",
        "--version": {
            description: "Print the current version of digo.",
            execute() {
                if (!taskName) {
                    digo.info(getVersion());
                    return false;
                }
            }
        },

        "-?": "--help",
        "-h": "--help",
        "--help": {
            description: "Print this message.",
            execute() {
                if (!taskName) {
                    digo.info("\nUsage: digo <task> [options]");
                    digo.info("\nOptions:\n\n{default:list}", { list: generateList(options) });
                    return false;
                }
            }
        },

        "--locale": {
            description: "Specify the locale to use to show messages, e.g. zh-cn",
            execute(name: string) {
                digo.dict = digo.plugin("digo-lang-" + name);
            }
        },

        // #endregion

        // #region TAB 补齐

        "--init-completion": {
            description: "Initialize tab completion for current environment.",
            execute(bashName: string) {
                // TODO: 添加 TAB 补齐支持。
                digo.fatal("Option '{option}' is not implemented yet.", { option: "--init-completion" });
                return false;
            }
        },

        "--completion": {
            description: null,
            execute(bashName: string) {
                // TODO: 添加 TAB 补齐支持。
                digo.fatal("Option '{option}' is not implemented yet.", { option: "--completion" });
                return false;
            }
        },

        "--show-completion": {
            description: null,
            execute() {
                const tasks = loadDigoFile();
                if (tasks) {
                    process.stdout.write(searchList(tasks, typeof arguments[0] === "string" ? arguments[0] : "").join("\n"));
                }
                return false;
            }
        },

        // #endregion

        // #region 调试

        "-d": "--debug",
        "--debug": {
            description: "Enable debug mode.",
            execute() { return startDebugger(false, arguments[0]); }
        },

        "--debug-brk": {
            description: "Enable debug mode and break on the first line.",
            execute() { return startDebugger(true, arguments[0]); }
        },

        // #endregion

        // #region 配置文件

        "--init": {
            description: "Create 'digofile.js'.",
            execute() {
                digo.init(typeof arguments[0] === "string" ? arguments[0] : undefined);
                return false;
            }
        },

        "--require": {
            description: "Require the specific module before loading digofile.",
            execute(path: string) { digo.plugin(path); }
        },

        "--digofile": {
            description: "Specify the digo file. Defaults to 'digofile.js'.",
            execute(path: string) { digoFile = path; }
        },

        "--cwd": {
            description: "Specify the current working directory.",
            execute(path: string) { cwd = path; }
        },

        "-ls": "--list",
        "--list": {
            description: "Print all tasks defined in digofile.",
            execute() {
                const tasks = loadDigoFile();
                if (tasks) {
                    digo.info("digo: {bin}({default:version})", { bin: __filename, version: getVersion() });
                    digo.info("file: {digofile}", { digofile: digoFile });
                    digo.info("\nDefined Tasks:\n\n{default:list}", { list: generateList(tasks) });
                }
                return false;
            }
        },

        // #endregion

        // #region 生成模式

        "--preview": {
            description: "Build all files, but do not save.",
            execute() { configs.push(["buildMode", "preview"]); }
        },

        "--clean": {
            description: "Clean build outputs.",
            execute() { configs.push(["buildMode", "clean"]); }
        },

        "-w": "--watch",
        "--watch": {
            description: "Build all files and start watching.",
            execute() { configs.push(["buildMode", "watch"]); }
        },

        "--server": {
            description: "Build all files and start a dev-server.",
            execute() { configs.push(["buildMode", "server"]); }
        },

        // #endregion

        // #region 日志

        "--verbose": {
            description: "Print all messages.",
            execute() { configs.push(["verbose", true]); }
        },

        "-e": "--error",
        "--error": {
            description: "Print errors only.",
            execute() { configs.push(["logLevel", "error"]); }
        },

        "--warning": {
            description: "Print errors and warnings only.",
            execute() { configs.push(["logLevel", "warning"]); }
        },

        "--info": {
            description: "Print errors, warnings and important informations only.",
            execute() { configs.push(["logLevel", "info"]); }
        },

        "--silent": {
            description: "Disable all outputs.",
            execute() { configs.push(["silent", true]); }
        },

        "--colors": {
            description: "Enable colorized outout.",
            execute() { configs.push(["colors", true]); }
        },

        "--no-colors": {
            description: "Disable colorized outout.",
            execute() { configs.push(["colors", false]); }
        },

        "--full-path": {
            description: "Print full path in outputs.",
            execute() { configs.push(["fullPath", true]); }
        },

        "--no-full-path": {
            description: "Do not print full path in outputs.",
            execute() { configs.push(["fullPath", false]); }
        },

        "--progress": {
            description: "Show progress bar.",
            execute() { configs.push(["progress", true]); }
        },

        "--no-progress": {
            description: "Hide progress bar.",
            execute() { configs.push(["progress", false]); }
        },

        "--report": {
            description: "Report build result.",
            execute() { configs.push(["report", true]); }
        },

        "--no-report": {
            description: "Do not report build result.",
            execute() { configs.push(["report", false]); }
        },

        // #endregion

        // #region 生成配置

        "--filter": {
            description: "Add a filter pattern.",
            execute(path: string) { configs.push(["filter", path]); }
        },

        "-i": "--ignore",
        "--ignore": {
            description: "Add an ignore pattern.",
            execute(path: string) { configs.push(["ignore", path]); }
        },

        "--ignore-file": {
            description: "Load specified ignore file. e.g. '--ignore-file .gitignore'.",
            execute(path: string) { configs.push(["ignoreFile", path]); }
        },

        "--encoding": {
            description: "Specify the default encoding. Defaults to 'utf-8'.",
            execute(encoding: string) { configs.push(["encoding", encoding]); }
        },

        "--overwrite": {
            description: "Allow overwriting source files.",
            execute() { configs.push(["overwrite", true]); }
        },

        "--no-overwrite": {
            description: "Disallow overwriting source files.",
            execute() { configs.push(["overwrite", false]); }
        },

        "--no-log-source": {
            description: "Hide source in logs.",
            execute() { configs.push(["logSource", null]); }
        },

        // #endregion

        // #region 源映射

        "-m": "--source-map",
        "--source-map": {
            description: "Generate source maps if available.",
            execute() { configs.push(["sourceMap", true]); }
        },

        "--no-source-map": {
            description: "Do not generate source maps.",
            execute() { configs.push(["sourceMap", false]); }
        },

        "--no-eval-source-map": {
            description: "Do not eval source maps.",
            execute() { configs.push(["evalSourceMap", false]); }
        },

        "--no-source-map-emit": {
            description: "Do not emit #SourceMappingURL comment into files.",
            execute() { configs.push(["sourceMapEmit", false]); }
        },

        "--source-map-inline": {
            description: "Inline source maps into files.",
            execute() { configs.push(["sourceMapInline", true]); }
        },

        "--source-map-sources": {
            description: "Include sources in source maps.",
            execute() { configs.push(["sourceMapIncludeSourcesContent", true]); }
        },

        "--source-map-root": {
            description: "Specify the url prefix for source maps.",
            execute(prefix: string) { configs.push(["sourceMapRoot", prefix]); }
        },

        // #endregion

    };

    // 解析命令行参数。
    let taskName: string | undefined;
    const argv = process.argv; // ["node.exe", "(root)/digo/bin/digo", ...]
    for (let i = 2; i < argv.length; i++) {

        // 处理选项名。
        const arg = argv[i];
        if (arg.charCodeAt(0) === 45/*-*/) {

            // -- 后的参数都只在配置文件本身使用。
            if (arg === "--") {
                break;
            }

            let option = (options as any)[arg];
            if (typeof option === "string") {
                option = (options as any)[option];
            }
            if (option && option.execute) {

                // 处理选项值。
                const value = i + 1 < argv.length && argv[i + 1].charCodeAt(0) !== 45 /*-*/ ? argv[++i] : true;

                // 解析参数。
                if (option.execute.length && value === true) {
                    return digo.fatal("Option '{option}' expects an argument.", { option: arg });
                }

                // 执行命令。
                if (option.execute(value) === false) {
                    return;
                }

            }

        } else if (!taskName) {
            taskName = arg;
        }

    }

    // 加载任务。
    const tasks = loadDigoFile(taskName || "default");
    if (!tasks) {
        return;
    }

    // 查找要执行的任务。
    const matchedTasks = searchList(tasks, taskName || "default");
    if (matchedTasks.length !== 1) {
        let list: string;
        if (matchedTasks.length) {
            const tasksList: { [key: string]: Function; } = { __proto__: null! };
            for (const taskName of matchedTasks) {
                tasksList[taskName] = tasks[taskName];
            }
            list = generateList(tasksList);
        } else {
            list = generateList(tasks);
        }

        return digo.fatal(matchedTasks.length ? "Task '{bright:task}' is not defined in {digofile}.\n\nDid you mean one of these?\n\n{list}" : list.length ? "Task '{bright:task}' is not defined in {digofile}.\n\nDefined Tasks:\n\n{list}" : "Task '{bright:task}' is not defined in {digofile}.\n\nNo tasks found.", {
            task: taskName,
            digofile: digo.getDisplayName(digoFile!),
            list: list
        });
    }

    // 应用设置。
    for (const config of configs) {
        digo.config({ [config[0]]: config[1] });
    }

    // 执行任务。
    const matchedTask = matchedTasks[0];
    const matchedTaskFunc = tasks[matchedTask];
    return digo.run(() => {
        if (matchedTaskFunc.length) {
            matchedTaskFunc.call(tasks, digo.parseArgs());
        } else {
            matchedTaskFunc.call(tasks);
        }
    }, matchedTask);

    /**
     * 在当前文件夹及上级文件夹中搜索包含指定路径的文件夹。
     * @param paths 要搜索的路径。
     * @returns 返回已找到的绝对位置。如果未找到则返回 undefined。
     */
    function searchFile(paths: string[]) {
        let dir = process.cwd();
        let prevDir: string;
        do {
            for (const path of paths) {
                const fullPath = np.join(dir, path);
                if (nfs.existsSync(fullPath)) {
                    return fullPath;
                }
            }
            prevDir = dir;
            dir = np.dirname(dir);
        } while (dir.length !== prevDir.length);
    }

    /**
     * 获取当前生成器的版本。
     * @return 返回包中定义的版本号，如 "v1.0.0"。
     */
    function getVersion() {
        return "v" + require("../package.json").version;
    }

    /**
     * 生成可读列表。
     * @param list 所有列表项。如果列表项的值相同，则打印时会被合并。
     * @return 返回已格式化的字符串。
     */
    function generateList(list: { [key: string]: string | (Function | Object) & { description?: string | null } }) {
        let result = "";
        const keys = Object.keys(list);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            // key 为空说明当前项已经被合并。
            if (!key) {
                continue;
            }

            // 获取当前项的值和描述。
            let value = list[key];
            while (typeof value === "string") {
                value = list[value];
            }

            // description 为空说明需要隐藏当前项。
            if (!value || value.description === null) {
                continue;
            }

            // 合并所有具有相同值的项。
            let line = "  " + key;
            for (let j = i + 1; j < keys.length; j++) {
                if (list[keys[j]] === value || list[keys[j]] === list[key]) {
                    line += ", " + keys[j];
                    keys[j] = null!;
                }
            }

            // 追加描述。
            if (value.description) {
                line += "                        ".substr(line.length) || "  ";
                line += digo.splitLog(digo.format(value.description), -line.length).join("\n                        ");
            }

            // 追加新行。
            if (result) {
                result += "\n";
            }
            result += line;
        }
        return result;
    }

    /**
     * 开始进入调试模式。
     * @param breakOnEntry 指示是否在入口处断点。
     * @param debugPort 指示调试的端口。
     * @return 如果已经在调试状态则返回 true，否则返回 false。
     */
    function startDebugger(breakOnEntry: boolean, debugPort?: string) {

        // 如果已经是调试模式则忽略。
        if (debugging) {
            return true;
        }

        // 检查调试端口。
        let parsedPort: number | undefined;
        if (typeof debugPort === "string") {
            parsedPort = parseInt(debugPort);
            if (!(parsedPort >= 1024 && parsedPort < 65536)) {
                digo.fatal("Debug port must be in range 1024 to 65535. Current value is {port}.", { port: debugPort });
                return false;
            }
        }

        // 添加调试参数启动新的进程。
        const argv = process.argv.slice(0);
        const match = /v(\d+)\.(\d+)/.exec(process.version) || [0, "0", "0"];
        const mainVersion = +match[1];
        const inspect = mainVersion > 7 || mainVersion === 7 && +match[2] >= 7 ? "inspect" : "debug";
        argv[0] = (breakOnEntry ? `--${inspect}-brk` : `--${inspect}`) + (parsedPort ? "=" + parsedPort : "");
        argv[1] = __filename;
        if (process.execArgv.indexOf("--harmony") >= 0) argv.unshift("--harmony");
        if (process.execArgv.indexOf("--experimental-modules") >= 0) argv.unshift("--experimental-modules");
        if (process.execArgv.indexOf("--no-warnings") >= 0) argv.unshift("--no-warnings");
        (require("child_process") as typeof _child_process).spawn(process.execPath, argv, { stdio: "inherit" });
        return false;
    }

    /**
     * 查找并加载配置文件。
     * @return 返回配置文件定义的所有任务。如果载入错误则返回 undefined。
     */
    function loadDigoFile(taskName?) {
        if (!digoFile) {
            const paths = ["digofile.js", "digofile.mjs"];
            for (const ext in digo.extensions) {
                paths.push("digofile" + ext);
            }
            digoFile = searchFile(paths);
            if (!digoFile) {
                return digo.fatal("Cannot find 'digofile.js'. Run 'digo --init' to create here.");
            }
        }
        if (digoFile.endsWith(".mjs") && process.execArgv.indexOf("--experimental-modules") < 0) {
            _child_process.spawn(process.execPath, process.execArgv.concat("--experimental-modules", "--experimental-vm-modules", "--experimental-worker", "--harmony", "--no-warnings", np.resolve(__dirname, "../loader/mjs.mjs"), digoFile, taskName, process.argv.slice(2)), {
                cwd: cwd,
                stdio: "inherit"
            });
            return null
        }
        if (cwd) {
            process.chdir(cwd);
        }
        return digo.loadDigoFile(digoFile, !cwd);
    }

    /**
     * 搜索以指定名称开始的键。
     * @param value 要搜索的键名。
     * @returns 返回所有匹配的键列表。
     */
    function searchList(list: { [key: string]: any; }, value: string) {
        if (value in list) {
            return [value];
        }
        const result: string[] = [];
        for (const key in list) {
            if (key.startsWith(value)) {
                result.push(key);
            }
        }
        return result;
    }

}
