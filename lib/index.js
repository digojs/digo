
var tpack = module.exports = new (require('./builder.js'));

// #region 任务

/**
 * 所有任务列表。
 */
tpack.tasks = Object.create(null);

/**
 * 创建或执行一个任务。
 * @param {String} taskName 相关的任务名。
 * @param {Function|Object|Array|String} taskAction 如果是定义任务，传递任务函数本身；否则传递任务的前置任务或执行任务的参数。
 * @param {Function|Boolean} subTask 任务内容或标识是否是子任务。
 * @returns {mixed} 返回任务。
 * @example 
 * tpack.task("hello")               // 执行任务 hello
 * tpack.task("hello", fn)           // 定义任务 hello
 * tpack.task("hello", ["base"], fn) // 定义任务 hello, 前置任务 base
 */
tpack.task = function (taskName, taskAction, subTask) {
	
	// tpack.task("hello") 定义任务。
	if (typeof taskAction === 'function') {
		return tpack.tasks[taskName] = taskAction;
	}
	
	// tpack.task("hello", "base") 定义任务别名。
	if (typeof taskAction === 'string') {
		return tpack.tasks[taskName] = function (options) {
			return tpack.task(taskName, options, true);
		};
	}
	
	// tpack.task("hello", ["base"], fn) 定义多任务别名。
	if (Array.isArray(taskAction)) {
		return tpack.tasks[taskName] = function (options) {
			if (options == null) options = {};
			for (var i = 0; i < taskAction.length; i++) {
				tpack.task(taskAction[i], options, true);
			}
			subTask && subTask.call(tpack.tasks, options);
		};
	}
	
	// 执行任务。
	if (typeof tpack.tasks[taskName] === 'function') {
		return tpack.tasks[taskName](taskAction == null ? {} : taskAction);
	}
	
	// 报告错误。
	tpack.error("Task `{0}` is undefined", taskName);
};

/**
 * 解析参数。
 * @param {} options 
 * @param {} building 
 * @returns {} 
 */
function initOptions(options) {
	tpack.destPath = options.dest || options.out || options.o;
	tpack.logLevel = options.level;
	return options;
};

// 默认任务。
tpack.task('default', ["build", "watch"]);

/*
 * 执行一次生成操作。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
tpack.task('build', function (options) {
	initOptions(options);
	return tpack.build();
});

/**
 * 执行监听任务。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
tpack.task('watch', function (options) {
	initOptions(options);
	return tpack.watch();
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
tpack.task('startServer', function (options) {
	initOptions(options);
	return tpack.startServer();
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
tpack.task('openServer', function (options) {
	initOptions(options);
	var server =  tpack.startServer();
	require('child_process').exec("start " + server.rootUrl, function (error, stdout, stderr) {
		if (error) {
			console.error(stderr);
		} else {
			console.log(stdout);
		}
	});
	return server;
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
tpack.task("help", function (options) {
	console.log('Usage: tpack task-name [Options]');
	console.log('Defined Tasks:');
	console.log('');
	for (var cmdName in tpack.tasks) {
		console.log('\t' + cmdName)
	}
});

tpack.task("b", "build");

tpack.task("w", "watch");

tpack.task("server", "startServer");
tpack.task("start", "startServer");
tpack.task("s", "startServer");

tpack.task("open", "openServer");
tpack.task("boot", "openServer");
tpack.task("o", "openServer");

tpack.task("?", "help");
tpack.task("h", "help");

// #endregion

// #region 语言

tpack.messages = {
	"Start Building...": "开始生成...",
	"Build Completed! ({1} files processed, {0} error(s) found)": "生成完成（已处理：{1} 文件，错误：{0}）",
	"Build Success! ({1} files processed)": "生成成功（已处理：{1} 文件）",
	"> Cleaning...": "> 清理目标文件夹...",
	"> Executing prebuild...": "> 执行 prebuild...",
	"> Executing postbuild...": "> 执行 postbuild...",
	"> Processing Files...": "> 处理文件...",
	"> Running run-once rules": "> 执行一次性规则...",
	"> Saving Files...": "> 保存文件..."
};

// #endregion