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
//tpack.src("assets/es/*.es").pipe(require("tpack-es6")).dest("assets/js/$1.js");
tpack.src("assets/es/*.coffee").pipe(require("tpack-coffee-script")).dest("assets/js/$1.js");

// 生成任务。
tpack.task('build', function (options) {
	
	// 生成时忽略此文件夹。
	tpack.ignore("libs");
	
	// 合并特定 JS 文件
	tpack.src("assets/es/page1.js", "assets/js/page2.js").pipe(require('tpack-concat')).dest("assets/es/page1-concat-page2.js");
	
	// 先生成之前定义的规则。
	tpack.build();
	
	var assetsOptions = {
		urlPostfix: "_=<md5>"
	};
	
	//// 压缩 CSS 和 JS
	//tpack.src("*.css").pipe(require('tpack-assets').css, assetsOptions).pipe(require('tpack-clean-css'));
	//tpack.src("*.js").pipe(require('tpack-assets').js, assetsOptions).pipe(require('tpack-uglify-js'));
	
	//// 处理 HTML 里的文件引用。
	//tpack.src("*.html", "*.htm").pipe(require("tpack-assets").html, assetsOptions);
	
	//// 直接生成文件
	//tpack.src().pipe(function (file, options, builder) {
	//    return "此项目是从 " + builder.src + " 生成的！不要直接修改，修改时间：" + new Date()
	//}).dest("NOTE.txt");
	
	// 重命名文件
	tpack.src("assets/js/*.js").pipe(require('tpack-rename')).dest("assets/js/$1_<md5>.js");
	
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
