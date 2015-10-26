// 载入 tpack 包。
var tpack = require("../lib/index.js");

// 设置源文件夹。(默认为当前文件夹，设置为 __dirname 允许在任何环境执行本文件）
tpack.srcPath = __dirname;

// 设置目标文件夹。
tpack.destPath = "_dest";

// 设置日志等级。（6 表示最高，调试级别）
tpack.logLevel = 6;

// 启用调试。
tpack.verbose = true;

// 设置全局忽略的路径。
tpack.ignore(".*", "_*", "$*", "*.psd", "*.ai", "*.log", "*.tmp", "*.db", "Desktop.ini", "tpack*", "dest");

// 全局统一配置。
//tpack.src("*.scss").pipe(require("tpack-sass")).dest("$1.css");
tpack.src("*.less").pipe(require("tpack-less")).dest("$1.css");
//tpack.src("*.es", "*.es6", "*.jsx").pipe(require("tpack-es6")).dest("$1.js");
tpack.src("*.coffee").pipe(require("tpack-coffee-script")).dest("$1.js");

// 解析 require
tpack.src("*.main.js").pipe(require("tpack-require"), {
    extensions: ['', '.js', '.json', '.jsx', '.es', '.es6', '.coffee'],
    exclude: ["*common*"]
});

// 生成任务。
tpack.task('build', function (options) {
    
    // 合并特定 JS 文件。
    tpack.src("assets/scripts/common.js", "assets/scripts/blog.js").pipe(require('tpack-concat')).dest("assets/scripts/common-concat-blog.js");
    
    var assetsOptions = {
        urlPostfix: "_=<md5>"
    };
    
    // 压缩 CSS 和 JS
    //tpack.src("*.css").pipe(require('tpack-assets').css, assetsOptions).pipe(require('tpack-clean-css'));
    //tpack.src("*.js").pipe(require('tpack-assets').js, assetsOptions).pipe(require('tpack-uglify-js'));
    
    // 处理 HTML 里的文件引用。
    tpack.src("*.html", "*.htm", "*.inc").pipe(require("tpack-assets").html, assetsOptions);
    
    // assets 目录下的文件统一使用 md5 命名。并重命名到 cdn_upload 目录。
    tpack.src("assets/*.*").pipe(require('tpack-rename')).dest("cdn_upload/$1_<md5s>.$2");
    
    //// libs 和 include 不拷贝到目标路径。
    //tpack.src("libs/*", "include/*").dest(null);
    
    // 直接生成文件
    tpack.src().pipe(function (file, options, builder) {
        return "此项目是从 " + builder.srcFullPath + " 生成的，不要修改！生成时间：" + new Date()
    }).dest("NOTE.txt");
    
    // 开始根据之前定制的所有规则开始生成操作。
    tpack.build();

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
