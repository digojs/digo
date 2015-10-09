#!/usr/bin/env node

var tpack = module.exports = require('../lib/index.js');

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

function runTask() {
    var argv = process.argv.slice(2);

    var cmdName = argv[argv.length - 1] || 'default';
    var options = parseArgv(argv);
    
    tpack.task(cmdName, options);
}

function runPackJs() {
    
    try {
        require(process.cwd() + '/tpack.js');
    }catch(e) {}

}

function main() {
    runPackJs();
    runTask();
}

main();