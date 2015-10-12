
var tpack = module.exports = new (require('./builder.js'));

// #region 监听

/**
 * 监听当前项目的改动。
 * @param {Function} callback 返回需要监听的任务列表。 
 */
tpack.watch = function (callback) {

};

// #endregion

// #region 任务

/**
 * 所有任务列表。
 */
tpack.tasks = Object.create(null);

/**
 * 创建或执行一个任务。
 * @returns {mixed} 返回任务。
 */
tpack.task = function (taskName, taskAction) {

    // 定义任务。
    if (typeof taskAction === 'function') {
        return tpack.tasks[taskName] = taskAction;
    }

    // 定义任务别名。
    if (typeof taskAction === 'string') {
        return tpack.tasks[taskName] = function (options) {
            return tpack(taskName, options);
        };
    }

    // 定义多任务别名。
    if (Array.isArray(taskAction)) {
        return tpack.tasks[taskName] = function (options) {
            for (var i = 0; i < taskAction.length; i++) {
                tpack.run(taskAction[i], options);
            }
        };
    }

    // 执行任务。
    if (typeof tpack.tasks[taskName] === 'function') {
        tpack.info("Running Task: {0}", taskName);
        tpack.run(taskName, taskAction);
        if (!tpack.autoFlush) {
            tpack.log("> Saving Files...");
            tpack.flush();
        }

        var fileCount = tpack.fileCount;
        var errorCount = tpack.errors.length;
        if (errorCount) {
            tpack.error("Task Completed! ({1} files processed, {0} error(s) found)", errorCount, fileCount);
        } else {
            tpack.success("Task Success! ({1} files processed)", errorCount, fileCount);
        }
        return;
    }

    // 报告错误。
    tpack.error("Task `{0}` is undefined", taskName);
};

/**
 * 手动执行任务。
 * @param {} taskName 
 * @param {} taskOptions 
 * @returns {} 
 */
tpack.run = function (taskName, taskOptions) {
    if (taskOptions == null) taskOptions = Object.create(null);
    tpack.tasks[taskName](taskOptions);
};

/**
 * 解析参数。
 * @param {} options 
 * @param {} building 
 * @returns {} 
 */
function initOptions(options, building) {
    options.dest = options.dest || options.out || options.o;
    if (options.level != undefined && options.logLevel == undefined) { options.logLevel = options.level; }
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
    return require('./build.js')(initOptions(options, true));
});

/**
 * 执行监听任务。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
tpack.task('watch', function (options) {
    return require('./watch.js')(initOptions(options, true));
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
tpack.task('openServer', function (options) {
    var server = require('./server.js')(initOptions(options, true));
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
