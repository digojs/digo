// 令当前文件可以访问全局 node_modules。
require('global-shim')();

// 载入 tpack 包。
var tpack = require("../lib/index.js");

tpack.task('hello', function (options) {
    console.log('hello world');
});

// 编译配置。
var prebuildConfigs = {
    src: __dirname + "/src",            // 发布的源文件夹。
    port: 7300,                         // 服务器监听的端口。
    ignores: [".git", ".svn", "*.psd", "*.ai", "*.tmp", "_*", ".*", "*.db", "$*", "Desktop.ini", "tpack*"], // 忽略的路径。
    logLevel: 4,                        // 日志等级。
    verbose: true,                      // 是否调试。
    rules: [                            // 发布的规则。
        { src: "*.less", process: require("tpack-less"), dest: "$1.css" },
        { src: "*.es", process: require("tpack-es6"), dest: "$1.js" },
       // { src: "*.coffee", process: require("tpack-coffee-script"), dest: "$1.js" }
    ]
};

// 发布配置。
var buildConfigs = {
    src: prebuildConfigs.src,           // 发布的源文件夹。
    dest: __dirname + "/dest",          // 发布的目标文件夹。
    ignores: prebuildConfigs.ignores,   // 忽略的路径。
    logLevel: prebuildConfigs.logLevel, // 日志等级。
    verbose: prebuildConfigs.verbose,   // 是否调试。
    rules: [                            // 发布的规则。

        // 压缩 CSS 和 JS
        //  { src: "*.css", process: [require('tpack-assets').css, require('tpack-clean-css')] },
        { src: "*.js", process: [require('tpack-assets').js, require('tpack-uglify-js')] },
        { src: "*.html", process: require("tpack-assets").html, urlPostfix: "_={md5}" },

        // 打包 requirejs。
        { src: "*.main.js", process: require('tpack-requirex'), dest: "$1.js" },

        // 合并生成文件。
        { src: ["a.js", "b.js"], process: require('tpack-concat'), dest: "a-concat-b.js" },

        // 直接生成文件
        { process: function (file, builder) { return "此项目是从 " + builder.src + " 生成的！不要直接修改，修改时间：" + new Date() }, dest: "NOTE.txt" }

    ]
};

tpack.task('build', function (options) {
    tpack.build(prebuildConfigs, buildConfigs);
});

tpack.task('watch', function (options) {
    tpack.watch(prebuildConfigs);
});

if (process.mainModule === module) {
    tpack.task('default');
}
