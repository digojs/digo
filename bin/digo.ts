#!/usr/bin/env node
/**
 * @fileOverview 命令行入口
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
        return require(localCli);
    }

    // 调试模式：异步执行以确保所有 debugger 正常中断。
    const debugging = process.execArgv.some(RegExp.prototype.test, /^\-\-debug/);
    if (debugging && !arguments[0]) {
        return setImmediate(main, true);
    }

    /**
     * 加载生成器。
     */
    const digo: typeof _digo = require("../lib/index");
    let configPath: string;
    let global: boolean;

    // 设置退出码。
    process.once("exit", function (code) {
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
                digo.info(getVersion());
                return false;
            }
        },

        "-?": "--help",
        "-h": "--help",
        "--help": {
            description: "Print this message.",
            execute() {
                digo.info("\nUsage: digo <task> [options]");
                digo.info("\nOptions:\n\n{default:list}", { list: generateList(options) });
                return false;
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
                process.stdout.write(searchTasks(loadConfig() || {}, word).join("\n"));
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

        // #region 即时任务

        "-r": "--require",
        "--require": {
            description: "Require the specific module.",
            execute(path: string) { digo.plugin(path); }
        },

        // #endregion

        // #region 配置文件

        "--init": {
            description: "Create 'digo.config.js'.",
            execute(type: string) {
                // TODO: 添加 --init 支持。
                digo.fatal("Option '{option}' is not implemented yet.", { option: '--init' });
                return false;

                // configFile = digo.argv["--config"] || search("digo.config", [".ts", ".coffee", ".js"]);
                // if (fs.existsSync(configFile)) {
                //     digo.fatal("Error: File '{config}' exists already. Nothing done.", { config });
                //     return false;
                // }

                //             if (!type) {
                //                 question(`Input a number of template below: 
                // 1. Empty config.
                // 2. WebSite: Basic supports.
                // 3. WebApp: Support commonjs style require.
                // 4. WebApp with React.
                // 5. WebApp with Vue.
                // 6. NodeJS
                // `, optionList["--init"].execute);
                //                 return false;
                //             }

                //             const config = digo.configFile || digo.resolve("digo.config.js");
                //             if (fs.existsSync(config)) {
                //                 digo.fatal("File '{config}' exists already. Nothing done.", { config });
                //                 return false;
                //             }

                //             try {
                //                 require("tutils/node/io").copyFile(require.resolve("./tpack.config.js"), config);
                //             } catch (e) {
                //                 digo.fatal("Cannot create file '{config}'. {error}", { config: config, error: e });
                //                 return false;
                //             }

                //             digo.info("{green:Done}. Config created at '{config}'.", { config: config }, digo.LogLevel.success);
                //             return false;
            }
        },

        "--config": {
            description: "Specify the config file. Defaults to 'digo.config.js'.",
            execute(path: string) { configPath = path; }
        },

        "-t": "--tasks",
        "--tasks": {
            description: "Print all tasks defined in config file.",
            execute() {
                const tasks = loadConfig();
                if (tasks) {
                    digo.info("Digo: {bin}(v{default:version}).", { bin: process.execPath, version: getVersion() });
                    digo.info("Config: '{config}'.", { config: configPath });
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
    const parsedArgv: { [key: number]: string;[key: string]: string | boolean; } = { __proto__: null };
    let commandCount = 0;
    for (let i = 2; i < argv.length; i++) {

        // 命令名。
        const name = argv[i];
        if (name.charCodeAt(0) !== 45/*-*/) {
            parsedArgv[commandCount++] = name;
            continue;
        }

        // 获取选项名和参数。
        let option = options[name];
        if (typeof option === "string") option = options[option];
        const value = i + 1 < argv.length && argv[i + 1].charCodeAt(0) !== 45/*-*/ ? argv[++i] : true;

        // 未知选项：为了支持插件自定义选项，不报错并继续解析。
        if (!option || !option.execute) {
            parsedArgv[name] = value;
            continue;
        }

        // 解析参数。
        if (option.execute.length && value === true) {
            digo.fatal("Option '{option}' expects an argument.", { option: name });
            return;
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

    // 根据命令行查找要执行的任务。
    const taskName = parsedArgv[0] || "default";
    const foundTasks = searchTasks(tasks, taskName);
    if (foundTasks.length !== 1) {
        digo.fatal("Task '{task}' is not defined in '{config}'.", { task: taskName, config: digo.getDisplayName(configPath) });
        if (foundTasks.length) {
            const tasksList: { [key: string]: Function; } = { __proto__: null };
            for (const taskName of foundTasks) {
                tasksList[taskName] = tasks[taskName];
            }
            digo.info("\nDid you mean one of these?\n\n{default:list}", { list: generateList(tasksList) });
        } else {
            digo.info("\nDefined Tasks:\n\n{default:list}", { list: generateList(tasks) });
        }
        return;
    }

    // 在子目录执行 digo 时，只处理当前目录的文件。
    if (!global && process.cwd() !== path.dirname(configPath)) {
        digo.config({ filter: process.cwd() });
    }

    // 执行任务。
    digo.run(tasks[foundTasks[0]].bind(digo, parsedArgv, commandCount), foundTasks[0]);

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
                const result = path.join(dir, name + extension);
                if (fs.existsSync(result)) {
                    return result;
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
        return require("../package.json").version;
    }

    /**
     * 生成可读列表。
     * @param list 所有列表项。如果列表项的值相同，则打印时会被合并。
     */
    function generateList(list: { [key: string]: string | { description?: string } }) {
        let result = "";
        const keys = Object.keys(list);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            // key 为空说明当前项已经被合并。
            if (!key) continue;

            // 获取当前项的值和描述。
            let value = list[key];
            if (typeof value === "string") {
                value = <{ description?: string }>list[value];
            }

            // description 为空说明需要隐藏当前项。
            if (!value || value.description === null) continue;

            // 合并所有具有相同值的项。
            let line = "  " + key;
            for (let j = i + 1; j < keys.length; j++) {
                if (list[keys[j]] === value || list[keys[j]] === list[key]) {
                    line += ", " + keys[j];
                    keys[j] = null;
                }
            }
            if (value.description) {
                line += "                        ".substr(line.length) || "  ";
                line += digo.splitLog(digo.format(value.description), -line.length).join("\n                        ");
            }
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
        if (debugging) {
            return true;
        }
        if (typeof debugPort === "string") {
            var parsedPort = parseInt(debugPort);
            if (!(parsedPort >= 1024 && parsedPort < 65536)) {
                digo.fatal("Debug port must be in range 1024 to 65535. Current value is {port}.", { port: debugPort });
                return false;
            }
        }
        const argv = process.argv.slice(0);
        argv[0] = (breakOnEntry ? "--debug-brk" : "--debug") + (parsedPort ? "=" + parsedPort : "");
        argv[1] = __filename;
        (<typeof _child_process>require('child_process')).spawn(process.execPath, argv, { stdio: 'inherit' });
        return false;
    }

    /**
     * 等待控制台输入并继续。
     * @param question 询问的问题。
     * @param callback 用户回答后的回调函数。
     */
    function question(question: string, callback: (answer: string) => boolean | void) {
        const rl = (<typeof _readline>require('readline')).createInterface({
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
        if (!configPath) {
            configPath = searchFile("digo.config", [".ts", ".coffee", ".js"]);
            if (!configPath) {
                digo.fatal("Not found 'digo.config.js'. Try run 'digo --init' to create here.");
                return;
            }
        }
        return digo.loadConfig(configPath);
    }

    /**
     * 搜索和指定任务名匹配的任务列表。
     * @param taskName 要查找的任务名。
     * @returns 返回匹配任务列表。
     */
    function searchTasks(tasks: { [key: string]: Function; }, taskName: string) {
        if (taskName in tasks) {
            return [taskName];
        }
        const result: string[] = [];
        for (const name in tasks) {
            if (name.startsWith(taskName)) {
                result.push(name);
            }
        }
        return result;
    }

}
