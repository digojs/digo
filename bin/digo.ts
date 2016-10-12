#!/usr/bin/env node
/**
 * @fileOverview digo 命令行程序
 * @author xuld <xuld@vip.qq.com>
 */
import * as path from "path";
import * as fs from "fs";
import * as _child_process from "child_process";
import * as _readline from "readline";
import * as _digo from '../lib/index';

main();

/**
 * 命令行入口。
 */
function main() {

    // 优先执行本地安装的版本。
    const localCli = searchFile("node_modules/digo/bin/digo", [".js"]);
    if (localCli && localCli !== __filename) {
        // 如果实际加载的目标模块即当前文件，则忽略之。
        if (require(localCli) !== exports) {
            return;
        }
    }

    // 调试模式：异步执行以确保所有 debugger 正常中断。
    const debugging = process.execArgv.some(RegExp.prototype.test, /^\-\-debug/);
    if (debugging && !arguments[0]) {
        return setImmediate(main, true);
    }

    const digo: typeof _digo = require("../lib/index");
    let digoFile: string;
    let cwd: string;
    let global: boolean;

    // 设置退出码。
    const initCwd = process.env["INIT_CWD"] = process.cwd();
    process.once("exit", (code: number) => {
        if (code === 0 && digo.errorCount) {
            process.exit(1);
        }
    });

    // 定义所有命令行参数。
    const options = {

        // #region 全局指令

        "-V": "--version",
        "-v": "--version",
        "--version": {
            description: "Print the current version of digo.",
            execute() {
                if (commandCount === 0) {
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
                if (commandCount === 0) {
                    digo.info("\nUsage: digo <task> [options]");
                    digo.info("\nOptions:\n\n{default:list}", { list: generateList(options) });
                    return false;
                }
            }
        },

        "--dict": {
            description: "Specify ui language.",
            execute(name: string) {
                digo.dict = digo.plugin(name);
            }
        },

        // #endregion

        // #region TAB 补齐

        "--init-completion": {
            description: "Initialize tab completion for current environment.",
            execute(bashName?: string) {
                // TODO: 添加 TAB 补齐支持。
                digo.fatal("Option '{option}' is not implemented yet.", { option: '--init-completion' });
                return false;
            }
        },

        "--completion": {
            description: null,
            execute(bashName: string) {
                // TODO: 添加 TAB 补齐支持。
                digo.fatal("Option '{option}' is not implemented yet.", { option: '--completion' });
                return false;
            }
        },

        "--show-completion": {
            description: null,
            execute(word: string) {
                const tasks = loadConfig();
                if (tasks) {
                    process.stdout.write(searchList(tasks, word).join("\n"));
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
                if (!digoFile) {
                    digoFile = "digofile.js";
                }
                if (fs.existsSync(digoFile)) {
                    digo.fatal("'{digofile}' exists already. Nothing done.", { digofile: digo.getDisplayName(digoFile) });
                    return false;
                }

                switch (path.extname(digoFile)) {
                    case ".ts":
                        var code = `import digo = require(\"digo\");

export default function() {
    // Add your code here.
}
`;
                        break;
                    case ".coffee":
                        var code = `digo = require 'digo'

exports.default = () -> 
  # Add your code here.`;
                        break;
                    default:
                        var code = `var digo = require(\"digo\");

exports.default = function() {
    // Add your code here.
};
`;
                        break;
                }

                try {
                    digo.writeFileSync(digoFile, code);
                } catch (e) {
                    digo.fatal(e);
                    return false;
                }

                digo.log("{green:Done!} '{digofile}' created successfully.", { digofile: digo.getDisplayName(digoFile) }, digo.LogLevel.success);
                return false;
            }
        },

        "-r": "--require",
        "--require": {
            description: "Require the specific module before load config file.",
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

        "-t": "--tasks",
        "--tasks": {
            description: "Print all tasks defined in config file.",
            execute() {
                const tasks = loadConfig();
                if (tasks) {
                    digo.info("digo: {bin}(v{default:version}).", { bin: process.execPath, version: getVersion() });
                    digo.info("file: '{digofile}'.", { digofile: digoFile });
                    digo.info("\nDefined Tasks:\n\n{default:list}", { list: generateList(tasks) });
                }
                return false;
            }
        },

        // #endregion

        // #region 生成模式

        "--preview": {
            description: "Build all files, but do not save.",
            execute() { digo.workingMode |= digo.WorkingMode.preview; }
        },

        "--clean": {
            description: "Clean build outputs.",
            execute() { digo.workingMode |= digo.WorkingMode.clean; }
        },

        "-w": "--watch",
        "--watch": {
            description: "Watch files.",
            execute() { digo.workingMode |= digo.WorkingMode.watch; }
        },

        // #endregion

        // #region 日志

        "--verbose": {
            description: "Print all outputs.",
            execute() { digo.logLevel = digo.LogLevel.verbose; }
        },

        "-e": "--error",
        "--error": {
            description: "Print errors only.",
            execute() { digo.logLevel = digo.LogLevel.error; }
        },

        "--warning": {
            description: "Print errors and warnings only.",
            execute() { digo.logLevel = digo.LogLevel.warning; }
        },

        "--info": {
            description: "Print errors, warnings and important informations only.",
            execute() { digo.logLevel = digo.LogLevel.info; }
        },

        "--silent": {
            description: "Disable all outputs.",
            execute() { digo.progress = false; digo.logLevel = digo.LogLevel.slient; }
        },

        "--colors": {
            description: "Enable colorized outout.",
            execute() { digo.colors = true; }
        },

        "--no-colors": {
            description: "Disable colorized outout.",
            execute() { digo.colors = false; }
        },

        "--full-path": {
            description: "Print full path in outputs.",
            execute() { digo.fullPath = true; }
        },

        "--progress": {
            description: "Show progress bar.",
            execute() { digo.progress = false; }
        },

        "--no-progress": {
            description: "Hide progress bar.",
            execute() { digo.progress = false; }
        },

        // #endregion

        // #region 生成配置

        "-g": "--global",
        "--global": {
            description: "Process files in whole project instead of current directory.",
            execute() { global = true; }
        },

        "--filter": {
            description: "Add a filter pattern.",
            execute(path: string) { digo.config({ filter: path }); }
        },

        "-i": "--ignore",
        "--ignore": {
            description: "Add an ignore pattern.",
            execute(path: string) { digo.config({ ignore: path }); }
        },

        "--ignore-file": {
            description: "Load specified ignore file. e.g. '--ignore-file .gitignore'.",
            execute(path: string) { digo.loadIgnore(path); }
        },

        "--encoding": {
            description: "Specify the default encoding. Defaults to 'utf-8'.",
            execute(encoding: string) { digo.encoding = encoding; }
        },

        "--overwrite": {
            description: "Allow overwriting source files.",
            execute() { digo.overwrite = true; }
        },

        // #endregion

        // #region 源映射

        "-m": "--source-map",
        "--source-map": {
            description: "Generate source maps if available.",
            execute() { digo.sourceMap = true; }
        },

        "--no-source-map": {
            description: "Do not generate source maps.",
            execute() { digo.sourceMap = false; }
        },

        "--source-map-inline": {
            description: "Inline source maps into files.",
            execute() { digo.sourceMapInline = true; }
        },

        "--source-map-sources": {
            description: "Include sources in source maps.",
            execute() { digo.sourceMapIncludeSourcesContent = true; }
        },

        "--source-map-root": {
            description: "Specify the url prefix for source maps.",
            execute(prefix: string) { digo.config({ sourceMapRoot: prefix }); }
        },

        // #endregion

    };

    // 解析命令行参数。
    const argv = process.argv; // ["node.exe", "(root)/digo/bin/digo", ...]
    const parsedArgv: { [name: number]: string;[name: string]: string | boolean; } = { __proto__: null };
    let commandCount = 0;
    let slashes = Infinity;
    for (let i = 2; i < argv.length; i++) {

        // 处理选项名。
        const name = argv[i];
        if (name.charCodeAt(0) !== 45/*-*/) {
            parsedArgv[commandCount++] = name;
            continue;
        }

        // -- 后的参数都只在配置文件本身使用。
        if (name === "--") {
            slashes = i;
            if (commandCount === 0) {
                commandCount = 1;
            }
            continue;
        }

        // 处理选项值。
        const value = i + 1 < argv.length && argv[i + 1].charCodeAt(0) !== 45/*-*/ ? argv[++i] : true;
        parsedArgv[name.replace(/^\-\-?/, "").replace(/\-([a-z])/, (_, word: string) => word.toUpperCase())] = value;
        if (i > slashes) {
            continue;
        }

        // 内置选项：调用特定功能。
        let option = options[name];
        if (typeof option === "string") option = options[option];
        if (!option || !option.execute) {
            continue;
        }

        // 解析参数。
        if (option.execute.length && value === true) {
            return digo.fatal("Option '{option}' expects an argument.", { option: name });
        }

        // 执行命令。
        if (option.execute(value) === false) {
            return;
        }

    }

    // 加载任务。
    const tasks = loadConfig();
    if (!tasks) {
        return;
    }

    // 查找要执行的任务。
    const taskName = parsedArgv[0] || "default";
    const matchedTasks = searchList(tasks, taskName);
    if (matchedTasks.length !== 1) {
        digo.fatal("Task '{task}' is not defined in '{digofile}'.", {
            task: taskName,
            digofile: digo.getDisplayName(digoFile)
        });
        if (matchedTasks.length) {
            const tasksList: { [key: string]: Function; } = { __proto__: null };
            for (const taskName of matchedTasks) {
                tasksList[taskName] = tasks[taskName];
            }
            digo.info("\nDid you mean one of these?\n\n{default:list}", { list: generateList(tasksList) });
        } else {
            digo.info("\nDefined Tasks:\n\n{default:list}", { list: generateList(tasks) });
        }
        return;
    }

    // 在子目录执行命令行时，只处理当前目录的文件。
    if (!global && process.cwd() !== initCwd) {
        digo.config({ filter: initCwd });
    }

    // 执行任务。
    return digo.run(tasks[matchedTasks[0]].bind(digo, parsedArgv, commandCount), matchedTasks[0]);

    /**
     * 在当前文件夹及上级文件夹中搜索包含指定路径的文件夹。
     * @param name 要搜索的路径。
     * @param extensions 要追加的扩展名。
     * @returns 返回已找到的绝对位置。如果未找到则返回 undefined。
     */
    function searchFile(name: string, extensions: string[]) {
        let dir = process.cwd();
        do {
            for (const extension of extensions) {
                const file = path.join(dir, name + extension);
                if (fs.existsSync(file)) {
                    return file;
                }
            }
            var prevDir = dir;
            dir = path.dirname(dir);
        } while (dir.length !== prevDir.length);
    }

    /**
     * 获取当前生成器的版本。
     * @return 返回包中定义的版本号，如 "1.0.0"。
     */
    function getVersion(): string {
        return require("digo/package.json").version;
    }

    /**
     * 生成可读列表。
     * @param list 所有列表项。如果列表项的值相同，则打印时会被合并。
     * @return 返回已格式化的字符串。
     */
    function generateList(list: { [key: string]: string | { description?: string } }) {
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
                    keys[j] = null;
                }
            }

            // 追加描述。
            if (value.description) {
                line += "                        ".substr(line.length) || "  ";
                line += digo.splitLog(digo.format(value.description), -line.length).join("\n                        ");
            }

            // 追加新行。
            if (result) result += "\n";
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
        if (typeof debugPort === "string") {
            var parsedPort = parseInt(debugPort);
            if (!(parsedPort >= 1024 && parsedPort < 65536)) {
                digo.fatal("Debug port must be in range 1024 to 65535. Current value is {port}.", { port: debugPort });
                return false;
            }
        }

        // 添加调试参数启动新的进程。
        const argv = process.argv.slice(0);
        argv[0] = (breakOnEntry ? "--debug-brk" : "--debug") + (parsedPort ? "=" + parsedPort : "");
        argv[1] = __filename;
        (<typeof _child_process>require("child_process")).spawn(process.execPath, argv, { stdio: "inherit" });
        return false;
    }

    /**
     * 等待控制台输入并继续。
     * @param question 询问的问题。
     * @param callback 用户回答后的回调函数。
     * @return 返回命令行接口。
     */
    function question(question: string, callback: (answer: string) => boolean | void) {
        const rl = (<typeof _readline>require("readline")).createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question(question, answer => {
            if (callback(answer) === false) {
                rl.close();
            }
        });
        return rl;
    }

    /**
     * 查找并加载配置文件。
     * @return 返回配置文件定义的所有任务。如果载入错误则返回 undefined。
     */
    function loadConfig() {
        if (!digoFile) {
            digoFile = searchFile("digofile", [".js"].concat(Object.keys(digo.extensions)));
            if (!digoFile) {
                digo.fatal("Cannot find 'digofile.js'. Run 'digo --init' to create here.");
                return;
            }
        }
        if (cwd) {
            process.chdir(cwd);
        }
        return digo.loadDigoFile(digoFile, !!cwd);
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
