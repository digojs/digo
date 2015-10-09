
/**
 * 创建或执行一个任务。
 * @returns {mixed} 返回任务。
 */
var task = module.exports = function (taskName, taskAction) {

    // 定义任务。
    if (typeof taskAction === 'function') {
        return task.tasks[taskName] = taskAction;
    }

    // 定义任务别名。
    if (typeof taskAction === 'string') {
        return task.tasks[taskName] = function (options) {
            return task(taskName, options);
        };
    }

    // 定义多任务别名。
    if (Array.isArray(taskAction)) {
        return task.tasks[taskName] = function (options) {
            for (var i = 0; i < taskAction.length; i++) {
                task(taskAction[i], options);
            }
        };
    }

    // 执行任务。
    if (typeof task.tasks[taskName] === 'function') {
        if (taskAction == null) taskAction = Object.create(null);
        return task.tasks[taskName](taskAction);
    }

    // 报告错误。
    console.error("Task is undefined: " + taskName);
};

task.tasks = Object.create(null);

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
task('default', ["build", "watch"]);

/*
 * 执行一次生成操作。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
task('build', function (options) {
    return require('./build.js')(initOptions(options, true));
});

/**
 * 执行监听任务。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
task('watch', function (options) {
    return require('./watch.js')(initOptions(options, true));
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
task('openServer', function (options) {
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
task("help", function (options) {
    console.log('Usage: tpack task-name [Options]');
    console.log('Defined Tasks:');
    console.log('');
    for (var cmdName in task.tasks) {
        console.log('\t' + cmdName)
    }
});

task("b", "build");

task("w", "watch");

task("server", "startServer");
task("start", "startServer");
task("s", "startServer");

task("open", "openServer");
task("boot", "openServer");
task("o", "openServer");

task("?", "help");
task("h", "help");
