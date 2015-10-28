// 载入 tpack 包。
var tpack = require("../lib/index.js");

// 设置源文件夹。(默认为当前文件夹，设置为 __dirname 允许在任何环境执行本文件）
tpack.srcPath = "";

// 设置目标文件夹。
tpack.destPath = "_dest";

// 设置日志等级。（6 表示最高，调试级别）
tpack.logLevel = 6;

// 启用调试。
tpack.verbose = true;

// 设置全局忽略的路径。
tpack.ignore(".*", "_*", "$*", "*.psd", "*.ai", "*.log", "*.tmp", "*.db", "Desktop.ini", "tpack*", tpack.destPath);

//// 所有任务都需要先执行以下预编译的规则。
//tpack.src("*.scss", "*.sass").pipe(require("tpack-sass")).dest("$1.css");
//tpack.src("*.less").pipe(require("tpack-less")).dest("$1.css");
//tpack.src("*.es", "*.es6", "*.jsx").pipe(require("tpack-babel")).dest("$1.js");
//tpack.src("*.coffee").pipe(require("tpack-coffee-script")).dest("$1.js");

var assetsConfigs = {

    // 解析 #include 指令。
    parseInclude: true,

    // 解析 ?__url 指令。
    parseUrl: true,

    // 解析 __dest 导出指令。
    parseDest: false,

    // 解析 <style> <script> 等标签。
    parseTags: true,

    // 解析 ?__inline 指令。
    parseInline: false,

    // 解析 CommonJs require 指令。
    parseCmdRequire: true,

    // 解析 AMD require 指令。
    parseAmdRequire: true,

    // 解析 CSS 地址指令。
    parseCssUrl: true,

    // require 全局搜索路径。如果未指定则不启用全局搜索功能，所有路径均为相对路径。
    paths: ["libs"],

    // 是否将目录层级上的所有 node_modules 文件夹追加到全局搜索路径。
    searchNodeModules: true,

    // require 未包含扩展名时，尝试自动追加的扩展名。
    extensions: ['.json', '.jsx', '.es', '.es6', '.coffee', '.js', '.scss', '.less', '.css'],

    // 将包含以下扩展名的文件自动导出到外部文件，而非放入当前文件。
    exports: {
        '.css': '../styles/$0.css',
        '.css': '../styles/$0.css',
    },

    // 自动排除以下文件。
    exclude: ["assets/common.js"]
};

// 解析资源文件中的 require 和 #include。
//tpack.src("*.html", "*.htm", "*.inc").pipe(require("tpack-assets").html, assetsConfigs);
//tpack.src("scripts/*.js").pipe(require("tpack-assets").js, assetsConfigs);
//tpack.src("styles/*.css").pipe(require("tpack-autoprefixer")).pipe(require("tpack-assets").css, assetsConfigs);

tpack.src("scripts/require-test.js").pipe(require("tpack-assets").js, assetsConfigs);

// 生成任务。
tpack.task('build', function (options) {

    //// 资源文件夹下的文件统一使用 md5 命名。并重命名到 cdn_upload 目录。
    //tpack.src(/^((scripts|styles|images|fonts|resources)\/([^\/]*\/)*[^\.]*?)\.(.*)$/i).pipe(require('tpack-rename')).dest("cdn_upload/$1_<md5s>.$4");

    //// libs 和 include 发布时忽略。
    //tpack.src("libs/*", "include/*").dest(null);

    //// 引用资源文件时，统一添加时间后缀。
    //assetsConfigs.urlPostfix = "_=<date>";
    //assetsConfigs.exportDest = true;

    //// 压缩 CSS 和 JS。
    //tpack.src("*.css").pipe(require('tpack-clean-css'));
    //tpack.src("*.js").pipe(require('tpack-uglify-js'));

    //// 合并特定 JS 文件。
    //tpack.src("scripts/common.js", "scripts/blog.js").pipe(require('tpack-concat')).dest("scripts/common-concat-blog.js");

    //// 直接生成文件。
    //tpack.src().pipe(function (file, options, builder) {
    //    return "此项目是从 " + builder.srcPath + " 生成的，不要修改！生成时间：" + new Date()
    //}).dest("NOTE.txt");

    // 开始根据之前定制的所有规则开始生成操作。
    tpack.build();

});

// 监听任务。
tpack.task('watch', function (options) {
    tpack.watch(options.path);
});

// 服务器任务。
tpack.task('server', function (options) {
    tpack.startServer(options.port || 8080);
});

// 支持在执行 node tpack.js 时直接执行 default 任务。
if (process.mainModule === module) {
    tpack.task('default');
}
