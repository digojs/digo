/* 这里放 page1 页面本身的 js */

// #exclude common/common
// #include ../libs/src/partB/a

// 同步加载模块，发布后包会被打包到当前文件。
var api_b = require('../libs/src/partB/b');

alert("page1");

function onClick() {

    // 异步加载模块，发布后包不会被打包进来
    require(['./page1_dep_async.js'], function (module) {

    });
}
