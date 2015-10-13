// 载入 tpack 包。
var tpack = require("../lib/index.js");

// 设置源文件夹。(默认为当前文件夹，设置为 __dirname 允许在任何环境执行本文件）
tpack.basePath = __dirname;

// 设置日志等级。（6 表示最高，调试级别）
tpack.logLevel = 6;

// 设置全局忽略的路径。
tpack.ignore(".*", "_*", "$*", "*.psd", "*.ai", "*.log", "*.tmp", "*.db", "Desktop.ini", "tpack*", "dest");

// 全局统一配置。
tpack.src("assets/scss/*.scss").pipe(require("tpack-sass")).dest("assets/css/$1.css");
tpack.src("assets/scss/*.less").pipe(require("tpack-less")).dest("assets/css/$1.css");
tpack.src("assets/es/*.es").pipe(require("tpack-es6")).dest("assets/js/$1.js");
tpack.src("assets/es/*.coffee").pipe(require("tpack-coffee-script")).dest("assets/js/$1.js");

// 生成任务。
tpack.task('build', function (options) {

    // 生成时忽略此文件夹。
    tpack.ignore("libs");

    // 合并特定 JS 文件
    tpack.src("assets/js/a.js", "assets/js/b.js").pipe(require('tpack-concat')).dest("assets/js/a-concat-b.js");

    // 重命名文件
    tpack.src("assets/js/a.js").pipe(require('tpack-rename')).dest("assets/js/a_<md5>.js");
	
	var assetsOptions = {
		urlPostfix: "_=<md5>"
	};

    // 压缩 CSS 和 JS
    tpack.src("*.css").pipe(require('tpack-assets').css, assetsOptions).pipe(require('tpack-clean-css'));
    tpack.src("*.js").pipe(require('tpack-assets').js, assetsOptions).pipe(require('tpack-uglify-js'));

    // 处理 HTML 里的文件引用。
    tpack.src("*.html", "*.htm").pipe(require("tpack-assets").html, assetsOptions);

    // 直接生成文件
    tpack.src().pipe(function (file, options, builder) {
        return "此项目是从 " + builder.src + " 生成的！不要直接修改，修改时间：" + new Date()
    }).dest("NOTE.txt");

    // 复制 assets/* -> cdnUpload/*
    tpack.src("assets/*").dest("cdn_upload/$1");

    // 开始根据之前定制的所有规则开始生成操作。
    tpack.build(options.dest || "_dest/");

});

// 监听任务。
tpack.task('watch', function (options) {
    tpack.watch();
});

// 服务器任务。
tpack.task('server', function (options) {
    tpack.startServer();
});

// 支持在执行 node tpack.js 时直接执行 default 任务。
if (process.mainModule === module) {
    tpack.task('default');
}







































//// 载入 tpack 包。
//var tpack = require("tpack");

//// 编译配置。
//var prebuildConfigs = {
//    src: __dirname,                     // 发布的源文件夹。
//    port: 7300,                         // 服务器监听的端口。
//    ignores: [".git", ".svn", "*.psd", "*.ai", "*.tmp", "_*", ".*", "*.db", "$*", "Desktop.ini", "tpack*", "dest"], // 忽略的路径。
//    logLevel: 4,                        // 日志等级。
//    verbose: true,                      // 是否调试。
//    rules: [                            // 发布的规则。
//        { src: "assets/scss/*.less", process: require("tpack-less"), dest: "assets/css/$1.css" },
//        { src: "assets/es/*.es", process: require("tpack-es6"), dest: "assets/js/$1.js" },
//        { src: "assets/es/*.coffee", process: require("tpack-coffee-script"), dest: "assets/js/$1.js" }
//    ]
//};

//// 发布配置。
//var buildConfigs = {
//    src: prebuildConfigs.src,           // 发布的源文件夹。
//    dest: prebuildConfigs.src + "/dest",// 发布的目标文件夹。
//    ignores: prebuildConfigs.ignores,   // 忽略的路径。
//    logLevel: prebuildConfigs.logLevel, // 日志等级。
//    verbose: prebuildConfigs.verbose,   // 是否调试。
//    rules: [                            // 发布的规则。

//        { src: "assets", dest: "static" },

//        // 压缩 CSS 和 JS
//        { src: "*.css", process: [require('tpack-assets').css, require('tpack-clean-css')] },
//        { src: "*.js", process: [require('tpack-assets').js, require('tpack-uglify-js')] },
//        { src: "*.html", process: require("tpack-assets").html, urlPostfix: "_={md5}" },

//        //// 打包 requirejs。
//        //{ src: "*.main.js", process: require('tpack-requirex'), dest: "$1.js" },

//        // 合并生成文件。
//        { src: ["a.js", "b.js"], process: require('tpack-concat'), dest: "a-concat-b.js" },

//        // 直接生成文件
//        { process: function (file, builder) { return "此项目是从 " + builder.src + " 生成的！不要直接修改，修改时间：" + new Date() }, dest: "NOTE.txt" }

//    ]
//};

//tpack.task('hello', function (options) {
//    console.log('hello world');
//});

//tpack.task('build', function (options) {
//    tpack.build(prebuildConfigs, buildConfigs);
//});

//tpack.task('watch', function (options) {
//    tpack.watch(prebuildConfigs);
//});

//if (process.mainModule === module) {
//    tpack.task('default');
//}






















//var tpack = require("tpack");

//tpack = new tpack.Builder();
//tpack.logLevel = 6;

//tpack.src("libs/src/partA/*").pipe(function (file, options, builder) {
//    file.content = file.content + "...";
//}).dest("_dest/$0");

//tpack.flush();
