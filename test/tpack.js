// 载入 tpack 包。
var tpack = require("../lib/index.js");

// 设置源文件夹。(默认为当前文件夹，设置为 __dirname 允许在任何环境执行本文件）
tpack.srcPath = __dirname;

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
	
	// 合并特定 JS 文件。
	tpack.src("assets/es/page1.js", "assets/js/page2.js").pipe(require('tpack-concat')).dest("assets/es/page1-concat-page2.js");
	
	// 首先执行之前的规则。
	tpack.build();
	
	// 第 2 次生成。
	tpack.destPath = options.dest || "_dest/";
	
	// libs 和 include 不拷贝到目标路径。
	tpack.src("libs/*", "include/*").dest(null);

	// assets 目录下的文件统一使用 md5 命名。并重命名到 cdn_upload 目录。
	tpack.src("assets/scss/*").dest("assets/css/$1");
	tpack.src("assets/es/*").dest("assets/js/$1");
	tpack.src("assets/*.*").pipe(require('tpack-rename')).dest("cdn_upload/$1_<md5>.$2");
	
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
		return "此项目是从 " + builder.srcFullPath + " 生成的，不要修改！生成时间：" + new Date()
	}).dest("NOTE.txt");
	
	// 开始根据之前定制的所有规则开始生成操作。
	tpack.build();

});

// 监听任务。
tpack.task('watch', function (options) {
	//tpack.watch();
});

// 服务器任务。
tpack.task('server', function (options) {
	tpack.startServer();
});

// 支持在执行 node tpack.js 时直接执行 default 任务。
if (process.mainModule === module) {
	tpack.task('default');
}
