#!/usr/bin/env node

var FS = require("fs");
var Path = require('path');
var tpack = module.exports = require('../lib/index.js');

main(process.argv.slice(2));

function main(argv) {
    
    // 解析命令行参数。
    var options = parseArgv(argv);
    var cmdName = argv[0] || 'default';
    
    // 预设命令参数。
    tpack.srcPath = options.src || options['in'] || options.i || tpack.srcPath;
    tpack.destPath = options.dest || options.out || options.o || tpack.destPath;
    tpack.logLevel = isNaN(+options.level) ? options.error ? 1 : tpack.logLevel : +options.level;
    tpack.verbose = options.verbose || options.debug || options.d || tpack.verbose;
    
    // 处理全局指令。
    if (options.v || options.version) {
        tpack.log("CLI Version: " + require('../package.json').version);
        return;
    }
    
    if (options.h || options.help || options["?"]) {
        options.help = cmdName;
        cmdName = 'help';
    }
    
    // 支持载入全局模块。
    require('require-global')([Path.resolve(__dirname, "../../"), Path.resolve(__dirname, "../node_modules/")]);
        
    // 执行 tpackCfg.js
    var tpackCfg = process.cwd() + '/tpackCfg.js';
    if (FS.existsSync(tpackCfg)) {
        require(tpackCfg);
    }
    
    // 驱动主任务。 
    tpack.task(cmdName, options);

}

/**
 * 解析命令提示符参数。
 */
function parseArgv(argv) {
    var obj = {};
    for (var i = 0; i < argv.length; i++) {
        var arg = argv[i];
        if (/^(\-|\/)/.test(arg)) {
            var value = argv[i + 1];
            var nextIsCommand = !value || /^(\-|\/)/.test(value);
            if (nextIsCommand) {
                value = true;
                argv.splice(i, 1);
                i--;
            } else {
                argv.splice(i, 2);
                i -= 2;
            }
            obj[arg.slice(1)] = value;
        }
    }
    return obj;
}
