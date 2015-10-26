
var Builder = require('./builder.js');

// #region 核心

exports.rootBuilder = exports.builder = new Builder;

function eachKey(obj, fn) {
    for (var key in obj) {
        fn(key);
    }
}

eachKey(Builder.prototype, function (key) {
    if (typeof Builder.prototype[key] === "function") {
        exports[key] = function () {
            return this.builder[key].apply(this.builder, arguments);
        };
    } else {
        exports.__defineGetter__(key, function () { return this.builder[key] });
        exports.__defineSetter__(key, function (value) { this.builder[key] = value; });
    }
});

/**
 * 重置当前任务内新建的所有规则。
 * @returns {} 
 */
exports.reset = function () {
    exports.builder = (exports.builder.parentBuilder || exports.rootBuilder).clone();
};

// #endregion

// #region 任务

/**
 * 所有任务列表。
 */
exports.tasks = Object.create(null);

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
exports.task = function (taskName, taskAction, subTask) {

    // tpack.task("hello") 定义任务。
    if (typeof taskAction === 'function') {
        return exports.tasks[taskName] = taskAction;
    }

    // tpack.task("hello", "base") 定义任务别名。
    if (typeof taskAction === 'string') {
        return exports.tasks[taskName] = function (options) {
            return exports.task(taskName, options, true);
        };
    }

    // tpack.task("hello", ["base"], fn) 定义多任务别名。
    if (Array.isArray(taskAction)) {
        return exports.tasks[taskName] = function (options) {
            if (options == null) options = {};
            for (var i = 0; i < taskAction.length; i++) {
                exports.task(taskAction[i], options, true);
            }
            subTask && subTask.call(exports.tasks, options);
        };
    }

    // 执行任务。
    if (typeof exports.tasks[taskName] === 'function') {
        exports.builder = exports.builder.clone();
        try {
            return exports.tasks[taskName](taskAction == null ? {} : taskAction);
        } finally {
            exports.builder = exports.builder.parentBuilder;
        }
    }

    // 报告错误。
    exports.error("Task `{0}` is undefined", taskName);
};

// 默认任务。
exports.task('default', ["build", "watch"]);

/*
 * 执行一次生成操作。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
exports.task('build', function (options) {
    return exports.build();
});

/**
 * 执行监听任务。
 * @param {Object} options 相关参数。
 * @returns {Builder} 返回构建器对象。
 */
exports.task('watch', function (options) {
    return exports.watch();
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
exports.task('startServer', function (options) {
    return exports.startServer();
});

/**
 * 启动服务器任务。
 * @param {Object} options 相关参数。
 * @returns {AspServer} 返回服务器对象。
 */
exports.task('openServer', function (options) {
    var server = exports.startServer();
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
exports.task("help", function (options) {
    console.log('Usage: tpack task-name [Options]');
    console.log('Defined Tasks:');
    console.log('');
    for (var cmdName in exports.tasks) {
        console.log('\t' + cmdName)
    }
});

exports.task("b", "build");

exports.task("w", "watch");

exports.task("server", "startServer");
exports.task("start", "startServer");
exports.task("s", "startServer");

exports.task("open", "openServer");
exports.task("boot", "openServer");
exports.task("o", "openServer");

// #endregion

// #region 语言

exports.messages = {
    "Start Building...": "开始生成...",
    "Build Completed! ({1} files saved, {0} error(s) found)": "生成完成（已生成：{1} 文件，错误：{0}）",
    "Build Success! ({1} files saved)": "生成成功（已生成：{1} 文件）",
    "> Cleaning...": "> 清理目标文件夹...",
    "> Executing prebuild...": "> 执行 prebuild...",
    "> Executing postbuild...": "> 执行 postbuild...",
    "> Processing Files...": "> 处理文件..."
};

// #endregion