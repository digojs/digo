// 令当前文件可以访问全局 node_modules。
require('global-shim')();

// 载入 tpack 包。
var tpack = require("../lib/index.js");

tpack.task('hello', function (options) {
    console.log('hello world');
});

if(process.mainModule == module){
	tpack.task('hello');
}