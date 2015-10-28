
    var __tpack__ = __tpack__ || {
        modules: { __proto__: null },
        define: function (moduleName, factory) {
            return __tpack__.modules[moduleName] = {
                factory: factory,
                exports: {}
            };
        },
        require: function (moduleName, callback) {
            var module = __tpack__.modules[moduleName];
            if (!module) {
                throw new Error('Can not find module: ' + moduleName);
            }
            if (!module.loaded) {
                module.loaded = true;
                module.factory.call(module.exports, module.exports, module, __tpack__.require, moduleName);
            }
            return module.exports;
        }
    };
__tpack__.define("libs/partC/c.js", function(exports, module, require){
module.exports = function () {
    console.log("c");
};
});
__tpack__.define("scripts/require-test.js", function(exports, module, require){

// 同步加载模块，发布后包会被打包到当前文件。
console.log("a");
console.log("b");
require("libs/partC/c.js")();

// 异步加载模块，发布后包不会被打包进来
// require(['./page1_dep_async.js'], function (module) {

// });
});

__tpack__.require("scripts/require-test.js");