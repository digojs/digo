
// 同步加载模块，发布后包会被打包到当前文件。
console.log("a");
// #include partB/b
require('partC/c')();

// 异步加载模块，发布后包不会被打包进来
// require(['./page1_dep_async.js'], function (module) {

// });
