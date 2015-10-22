/**
 * @fileOverview 构建逻辑核心。
 */

var Path = require('path');
var FS = require('fs');
var IO = require('tealweb/io');
var Lang = require('tealweb/lang');

// #region Builder

/**
 * 表示一个构建工具。
 * @class
 */
function Builder() {
    this.errors = [];
    this.ignores = [];
    this.rules = [];
    this.runOnceRules = [];
    this.files = Object.create(null);
}

// #region 日志功能

/**
 * 表示日志等级的枚举。
 * @enum
 */
Builder.LOG_LEVEL = {
    
    /**
     * 无日志。
     */
    none: 0,
    
    /**
     * 错误级别。
     */
    error: 1,
    
    /**
     * 警告级别。
     */
    warn: 2,
    
    /**
     * 成功级别。
     */
    success: 3,
    
    /**
     * 信息级别。
     */
    info: 4,
    
    /**
     * 普通级别。
     */
    log: 5,
    
    /**
     * 调试级别。
     */
    debug: 6
};

/**
 * 底层输出一条内容。
 * @param {String} message 要输出的信息。 
 * @param {Number} logLevel 要输出的日志等级。
 */
Builder.prototype.write = function (message, logLevel) {
    var formator = [0, '\033[49;31;1m#\033[0m', '\033[49;33;1m#\033[0m', '\033[49;32;1m#\033[0m', '\033[32m#\033[0m', '\033[32m#\033[0m'][logLevel];
    if (formator) {
        message = formator.replace('#', message);
    }
    return logLevel == Builder.LOG_LEVEL.error ? console.error(message) :
        logLevel == Builder.LOG_LEVEL.warn ? console.warn(message) :
        logLevel == Builder.LOG_LEVEL.info || logLevel == Builder.LOG_LEVEL.success ? console.info(message) :
        console.log(message);
};

/**
 * 打印一条普通日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.log = function (message) {
    if (this.logLevel < Builder.LOG_LEVEL.log) return;
    message = this.messages[message] || message;
    message = String.format.apply(String, arguments);
    return this.write(message, Builder.LOG_LEVEL.log);
};

/**
 * 打印一条信息日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.info = function (message) {
    if (this.logLevel < Builder.LOG_LEVEL.info) return;
    message = this.messages[message] || message;
    message = String.format.apply(String, arguments);
    return this.write(message, Builder.LOG_LEVEL.info);
};

/**
 * 打印一条警告日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.warn = function (message) {
    if (this.logLevel < Builder.LOG_LEVEL.warn) return;
    message = this.messages[message] || message;
    message = String.format.apply(String, arguments);
    return this.write(message, Builder.LOG_LEVEL.warn);
};

/**
 * 打印一条错误日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.error = function (message) {
    message = this.messages[message] || message;
    message = String.format.apply(String, arguments);
    this.errors.push(message);
    return this.logLevel >= Builder.LOG_LEVEL.error && this.write(message, Builder.LOG_LEVEL.error);
};

/**
 * 打印一条成功日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.success = function (message) {
    if (this.logLevel < Builder.LOG_LEVEL.success) return;
    message = this.messages[message] || message;
    message = String.format.apply(String, arguments);
    return this.write(message, Builder.LOG_LEVEL.success);
};

/**
 * 打印一条调试信息。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.debug = function (message) {
    if (this.logLevel < Builder.LOG_LEVEL.debug) return;
    message = this.messages[message] || message;
    message = String.format.apply(String, arguments);
    return this.write(message, Builder.LOG_LEVEL.debug);
};

// #endregion

// #region 配置

/**
 * 获取或设置当前构建工具的原始路径。
 */
Builder.prototype.srcPath = "";

/**
 * 获取或设置当前构建工具的生成路径。
 */
Builder.prototype.destPath = "";

/**
 * 项目中路径 / 表示的文件夹。
 */
Builder.prototype.virtualPath = "";

/**
 * 获取或设置当前构建工具的日志等级。
 */
Builder.prototype.logLevel = Builder.LOG_LEVEL.log;

/**
 * 获取或设置当前构建工具是否进行调试。
 */
Builder.prototype.verbose = false;

/**
 * 获取或设置当前构建工具的默认编码。
 */
Builder.prototype.encoding = "utf-8";

/**
 * 存储各消息的翻译版本。
 */
Builder.prototype.messages = Object.create(null);

/**
 * 添加一个忽略项。
 * @param {Object} ... 要忽略的文件或文件夹路径。支持通配符、正则表达式或函数表达式。
 * @returns this 
 */
Builder.prototype.ignore = function () {
    this._ignoreFilter = null;
    this.ignores.push.apply(this.ignores, arguments);
    return this;
};

/**
 * 判断指定路径是否被忽略。
 * @param {String} path 要判断的文件或文件夹路径。
 * @returns {Boolean} 
 */
Builder.prototype.ignored = function (path) {
    if (!this._ignoreFilter) {
        this._ignoreFilter = createPathFilter(this.ignores);
    }
    return this._ignoreFilter(path);
};

/**
 * 添加针对指定路径的处理规则。
 * @param {String|RegExp|Function} ... 要处理的文件路径。支持通配符、正则表达式或函数表达式。
 * @returns {BuildRule} 返回一个生成任务。
 */
Builder.prototype.src = function () {
    var rule = new BuildRule(arguments);
    if (rule.srcPath.length > 0) {
        this.rules.push(rule);
    } else {
        this.runOnceRules.push(rule);
    }
    return rule;
};

/**
 * 创建包含相同配置的新构建器。
 * @return {Builder}
 */
Builder.prototype.clone = function () {
    var result = new Builder();
    delete result.fileCount;
    result.parentBuilder = result.__proto__ = this;
    result.rules = this.rules.slice(0);
    result.runOnceRules = this.runOnceRules.slice(0);
    result.ignores = this.ignores.slice(0);
    return result;
};

/**
 * 获取当前构建器的源完整路径。
 */
Builder.prototype.__defineGetter__('srcFullPath', function () {
    return Path.resolve(this.srcPath || '');
});

/**
 * 获取当前构建器的目标完整路径。
 */
Builder.prototype.__defineGetter__('destFullPath', function () {
    return this.getFullPath(this.destPath);
});

/**
 * 获取指定路径的完整路径。如 E:/a/b.jpg
 * @param {String} path 要获取的路径。
 */
Builder.prototype.getFullPath = function (path) {
    return Path.join(this.srcFullPath, path || '');
};

/**
 * 获取指定路径的简短路径。如 a/b.jpg
 * @param {String} fullPath 要获取的完整路径。
 */
Builder.prototype.getPath = function (fullPath) {
    return /^\/|\:/.test(fullPath) ? Path.relative(this.srcFullPath, fullPath).replace(/\\/g, "/") : fullPath;
};

// #endregion

// #region 生成

/**
 * 根据当前设置的规则生成整个项目。
 * @param {Boolean} [clean] 指示是否在生成前清理文件夹。默认为自动清理。
 * @returns {Number} 返回本次生成所保存的文件数。 
 */
Builder.prototype.build = function (clean) {
    
    // 1. 准备工作。
    this.info("Start Building...");
    var srcFullPath = this.srcFullPath;
    var destFullPath = this.destFullPath;
    this.info("{0} -> {1}", srcFullPath, destFullPath);
    
    // 2. 清理文件夹。
    if (clean == null ? srcFullPath.indexOf(destFullPath) < 0 : clean) {
        this.debug("> Cleaning...", this);
        try {
            IO.cleanDir(destFullPath);
        } catch (e) {
            //  this.error('Clean {0} Error: {1}', destFullPath, e);
        }
    }
    
    // 3. 处理所有文件。
    this.debug("> Processing Files...", this);
    this.files = Object.create(null);
    IO.walkDir(srcFullPath, function (path, isDir) {
        // 路径是否被忽略。
        if (this.ignored(path)) {
            return false;
        }
        // 编译文件。
        if (!isDir) {
            this.processFile(path);
        }
    }.bind(this));
    
    // 4. 执行一次性任务。
    if (this.runOnceRules.length > 0) {
        this.debug("> Run run-once rules...", this);
        for (var i = 0; i < this.runOnceRules.length; i++) {
            var file = this.files["#Generated_" + i] = new BuildFile(this, "", "");
            this.processFileWithRule(file, this.runOnceRules[i], this.runOnceRules[i].destPath);
            this.log("A {0}", file.path);
        }
    }
    
    // 5. 保存生成文件。
    this.debug("> Saving Files...", this);
    var fileCount = 0;
    for (var path in this.files) {
        try {
            if (this.files[path].save(destFullPath)) {
                fileCount++;
            }
        } catch (e) {
            this.error('Saving {0} Fails: {1}', this.files[path].path, e);
        }
    }
    
    // 6.输出结果。
    if (fileCount > 0) {
        this.info("{0} -> {1}", srcFullPath, destFullPath);
    }
    
    var errorCount = this.errors.length;
    if (errorCount) {
        this.error("Build Completed! ({0} files updated, {1} error(s) found)", fileCount, errorCount);
    } else {
        this.success("Build Success! ({0} files updated)", fileCount, errorCount);
    }

    return fileCount;
};

/**
 * 根据当前设置的规则生成特定文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [dest] 生成文件的保存文件夹。默认为当前文件夹。
 */
Builder.prototype.buildFile = function (path) {
    var file = this.processFile(path, null, true);
    file.save();
    return file;
};

/**
 * 根据当前设置的规则处理指定的文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [content] 手动指定文件的内容。
 * @param {Boolean} [isTmpFile] 指示当前文件是否是临时文件。
 * @return {BuildFile} 返回文件信息。
 */
Builder.prototype.processFile = function (path, content, isTmpFile) {
    
    // 获取或创建文件。
    var file = !isTmpFile && this.files[path] || (this.files[path] = new BuildFile(this, path, content));
    
    var processed = false;
    var lastErrorCount = this.errors.length;
    
    // 依次执行所有规则。
    for (var i = 0; i < this.rules.length; i++) {
        var rule = this.rules[i];
        // 如果指定规则可用于处理指定文件，则执行规则。
        var dest = rule.match(file.path);
        if (dest !== null) {
            processed = true;
            this.processFileWithRule(file, rule, dest);
        }
    }
    
    // 临时文件不保存也不输出日志。
    if (isTmpFile) {
        delete this.files[path];
    }
    
    // 输出处理日志。
    if (!isTmpFile && this.errors.length === lastErrorCount) {
        if (!processed) {
            file.srcFullPath !== file.destFullPath && this.log("A {0}", file.destPath);
        } else if (!file.destPath) {
            this.log("D {0}", file.srcPath);
        } else if (file.srcPath === file.destPath) {
            this.log("P {0}", file.srcPath);
        } else {
            this.log("M {0} -> {1}", file.srcPath, file.destPath);
        }
    }
    
    return file;
};

/**
 * 根据指定的规则处理指定的文件。
 * @param {BuildFile} file 要处理的文件。
 * @param {BuildRule} rule 要使用的规则。
 * @param {String} dest 生成的目标文件。
 * @param {Boolean} isTmpFile 指示是否是临时文件。
 */
Builder.prototype.processFileWithRule = function (file, rule, dest) {
    
    // 更新文件的路径。
    file.prevPath = file.destPath;
    file.destPath = dest;
    
    // 根据当前规则更新文件的最终内容。
    for (var i = 0; i < rule.processors.length; i++) {
        if (this.verbose) {
            file.content = rule.processors[i].call(rule, file, rule.processorOptions[i], this);
        } else {
            try {
                file.content = rule.processors[i].call(rule, file, rule.processorOptions[i], this);
            } catch (e) {
                this.error("{0}: Uncaught Error: {1}", file.srcFullPath, e.message);
                break;
            }
        }
    }

};

/**
 * 添加一个已生成的文件。
 * @returns {} 
 */
Builder.prototype.addFile = function (path, content) {
    delete this.files[path];
    return this.processFile(path, content);
};

/**
 * 获取指定规则匹配到的所有文件。
 * @param {String} path 要处理的路径。
 * @returns {String} 返回不含绝对路径的部分。
 */
Builder.prototype.getFilesByRule = function (rule) {
    
    // 特定的规则直接获取对应文件列表。
    if (isSpecifiedPath(rule.srcPath)) {
        return rule.srcPath;
    }
    
    var files = [];
    IO.walkDir(this.src, function (path, isDir) {
        
        // 路径是否被忽略。
        if (this.ignored(path)) {
            return false;
        }
        
        // 将文件加入到待编译列表。
        if (!isDir && rule.match(path) !== null) {
            files.push(path);
        }

    }.bind(this));
    return files;
};

/**
 * 根据当前设置的规则处理指定的文件的依赖项。
 * @param {String} baseFile 当前正在处理的文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [content] 手动指定文件的内容。
 * @return {BuildFile} 返回文件信息。
 */
Builder.prototype.processDependency = function (baseFile, path, content) {
    
    // 存在内容说明是自定义内容。
    if (content != null) {
        return this.processFile(path, content, true);
    }
    
    // 否则说明是当前文件的依赖文件。
    var fullPath = this.getFullPath(path);
    if (IO.existsFile(fullPath)) {
        var file = this.processFile(path, content);
        baseFile.dependencies.push(file);
        return file;
    }
    
    // 文件不存在输出警告。
    this.warn("{0}: Reference not found: {1}", baseFile.srcFullPath, fullPath);
    var file = new BuildFile(this, path, content);
    file.notFound = true;
    return file;
};

// #endregion

// #region 监听

/**
 * 监听当前项目的改动。
 * @param {Function} callback 返回需要监听的任务列表。 
 */
Builder.prototype.watch = function () {
    var builder = this;
    this.watcher = watch(this.srcFullPath, function (path) {
        if (builder.ignored(path)) {
            return false;
        }
        
        // 判断是否符合任一规则。
        for (var i = 0; i < builder.rules.length; i++) {
            if (builder.rules[i].match(path) !== null) {
                return true;
            }
        }
        
        return false;
    }, function (path) {
        builder.buildFile(builder.getPath(path));
    });
    this.info("Watching {0}...", this.getFullPath('.'));
};

function watch(path, filter, callback) {
    var watcher = require('chokidar').watch(path).on('change', callback);
    watcher._isIgnored = filter;
    return watcher;
}

// #endregion

// #region 服务器

/**
 * 启用当前服务器。
 * @param {String|Number} url 服务器地址或端口。 
 */
Builder.prototype.startServer = function (url) {
    var HttpServer = require('aspserver').HttpServer;
    var server = new HttpServer({
        url: url || this.url,
        physicalPath: this.srcPath,
        handlers: this.handlers,
        modules: this.modules,
        mimeTypes: this.mimeTypes,
        defaultPages: this.defaultPages,
        urlRewrites: this.urlRewrites
    });
    
    var builder = this;
    server.on('start', function () {
        builder.log("Server Running At {rootUrl}", this);
    });
    
    server.on('stop', function () {
        builder.log("Server Stopped At {rootUrl}", this);
    });
    
    server.on('error', function (e) {
        if (e.code === 'EADDRINUSE') {
            builder.error(this.address && this.address !== '0.0.0.0' ? 'Create Server Error: Port {port} of {address} is used by other programs.' : 'Create Server Error: Port {port} is used by other programs.', this);
        } else {
            builder.error(e.toString());
        }
    });
    
    server.start();
    
    return server;
};

// #endregion

module.exports = Builder;

// #endregion

// #region BuildFile

/**
 * 表示一个生成文件。一个生成文件可以是一个物理文件或虚拟文件。
 * @param {Builder} builder 当前文件所属的创建器。
 * @param {Builder} path 当前文件的路径。
 * @param {Builder} [content] 当前文件的内容。
 * @class
 */
function BuildFile(builder, path, content) {
    this._builder = builder;
    
    this.srcPath = this.destPath = path || '';
    this.content = content;
    this.dependencies = [];
}

BuildFile.prototype.modified = false;
BuildFile.prototype._contentUpdated = false;

/**
 * 获取或设置当前文件的原始路径。
 * @type {String}
 * @name srcPath
 */
 
/**
 * 获取当前文件的目标路径。
 * @type {String}
 * @name destPath
 */

/**
 * 获取当前文件的原始完整路径。
 * @type {String}
 */
BuildFile.prototype.__defineGetter__('srcFullPath', function () {
    return this._builder.getFullPath(this.srcPath);
});

/**
 * 获取当前文件的目标完整路径。如果文件即将被删除则返回 @null。
 * @type {String}
 */
BuildFile.prototype.__defineGetter__('destFullPath', function () {
    return this.destPath ? Path.join(this._builder.destFullPath, this.destPath) : null;
});

/**
 * 获取当前文件的最终路径。
 */
BuildFile.prototype.__defineGetter__('path', function () { return this.destPath; });

/**
 * 设置当前文件的最终路径。
 */
BuildFile.prototype.__defineSetter__('path', function (value) { this.destPath = value; this.modified = true; });

/**
 * 获取当前文件的最终文本内容。
 * @type {String}
 */
BuildFile.prototype.__defineGetter__('content', function () {
    if (this._content == undefined) {
        this._content = this._buffer ? this._buffer.toString(this._builder.encoding) : this.load(this._builder.encoding);
    }
    return this._content;
});

/**
 * 设置当前文件的最终文本内容。
 * @type {String}
 */
BuildFile.prototype.__defineSetter__('content', function (value) {
    if (value != undefined) {
        this._content = value;
        this._buffer = null;
        this._contentUpdated = true;
        this.modified = true;
    }
});

/**
 * 获取当前文件的最终二进制内容。
 * @type {Buffer}
 */
BuildFile.prototype.__defineGetter__('buffer', function () {
    if (this._buffer == undefined) {
        this._buffer = this._content != undefined ? new Buffer(this._content) : this.load();
    }
    return this._buffer;
});

/**
 * 设置当前文件的最终二进制内容。
 * @type {Buffer}
 */
BuildFile.prototype.__defineSetter__('buffer', function (value) {
    this._buffer = value;
    this._content = null;
    this._contentUpdated = true;
    this.modified = true;
});

/**
 * 从硬盘载入当前文件的内容。
 * @param {String} [encoding] 解析文本内容的编码。
 * @return {String|Buffer} 如果指定了编码则返回文件文本内容，否则返回文件数据。
 */
BuildFile.prototype.load = function (encoding) {
    var srcFullPath = this._builder.getFullPath(this.srcPath);
    return encoding ? IO.readFile(srcFullPath, encoding) : IO.existsFile(srcFullPath) ? FS.readFileSync(srcFullPath) : new Buffer(0);
};

/**
 * 保存当前文件内容。
 * @return {Boolean} 如果成功保存则返回 @true，否则返回 @false。
 */
BuildFile.prototype.save = function () {
    
    // 如果目标路径为 null，表示不生成文件。
    // 不重复生成。
    if (!this.destPath || !this.modified) {
        return false;
    }
    
    this.modified = false;
    
    // 获取目标保存路径。
    var destFullPath = this.destFullPath;
    
    // 内容发生改变则存储文件。
    if (this._contentUpdated) {
        IO.ensureDir(destFullPath);
        if (this._buffer != undefined) {
            FS.writeFileSync(destFullPath, this._buffer);
        } else {
            FS.writeFileSync(destFullPath, this._content, this._builder.encoding);
        }
        return true;
    }
    
    // 仅路径改变则简单复制文件。
    var srcFullPath = this.srcFullPath;
    if (srcFullPath !== destFullPath) {
        IO.copyFile(srcFullPath, destFullPath);
        return true;
    }
    
    return false;
};

BuildFile.prototype.valueOf = function () { return this.path; };

BuildFile.prototype.toString = function () { return this.content; };

/**
 * 获取当前文件内指定相对路径表示的实际路径。
 * @param {String} relativePath 要处理的绝对路径。如 ../a.js
 */
BuildFile.prototype.resolvePath = function (relativePath) {
    return (/^\//.test(relativePath) ? Path.join(this._builder.virtualPath + relativePath).replace(/\\/g, '/').replace(/^\//, '') : Path.join(Path.dirname(this.srcPath), relativePath).replace(/\\/g, '/'));
};

/**
 * 获取在当前文件内引用指定路径所使用的相对路径。
 * @param {String} path 要处理的路径。如 styles/test.css（注意不能是绝对路径）
 */
BuildFile.prototype.relativePath = function (path) {
    return Path.relative(Path.dirname(this.destPath), path).replace(/\\/g, '/');
};

/**
 * 获取当前文件的所有依赖项（包括直接依赖和间接依赖）
 * @returns {Array} 返回由各依赖的 BuildFile 组成的数组。 
 */
BuildFile.prototype.getAllDependencies = function () {
    var result = [];
    function addDep(d) {
        result.push(d);
        for (var i = 0; i < d.dependencies.length; i++) {
            if (result.indexOf(d.dependencies[i]) < 0) {
                addDep(d.dependencies[i]);
            }
        }
    }
    addDep(this);
    return result;
};

/**
 * 判断当前文件是否依赖指定的文件。
 * @param {BuildFile} file 要判断的目标文件。
 * @returns {Boolean} 
 */
BuildFile.prototype.hasDependency = function (file) {
    return this.getAllDependencies().indexOf(file) >= 0;
};

exports.BuildFile = BuildFile;

// #endregion

// #region BuildRule

/**
 * 表示一个生成规则。
 * @class
 */
function BuildRule(src) {
    this.srcPath = [].slice.call(src);
    this.ignores = [];
    this.processors = [];
    this.processorOptions = [];
}

/**
 * 添加一个忽略项。
 * @param {Object} ... 要忽略的文件或文件夹路径。支持通配符、正则表达式或函数表达式。
 * @returns this 
 */
BuildRule.prototype.ignore = function () {
    this._ignoreFilter = null;
    this.ignores.push.apply(this.ignores, arguments);
    return this;
};

/**
 * 判断指定路径是否被当前规则忽略。
 * @param {String} path 要判断的文件或文件夹路径。
 * @returns this 
 */
BuildRule.prototype.ignored = function (path) {
    if (!this._ignoreFilter) {
        this._ignoreFilter = createPathFilter(this.ignores);
    }
    return this._ignoreFilter(path) !== null;
};

/**
 * 添加一个处理器。
 * @param {Function} processor 要追加的处理器。
 * @param {Object} [processOptions] 传递给处理器的配置对象。
 * @returns this 
 */
BuildRule.prototype.pipe = function (processor, processorOptions) {
    this.processors.push(processor);
    this.processorOptions.push(processorOptions || {});
    return this;
};

/**
 * 设置当前规则的目标路径。
 * @param {String} path 要设置的目标路径。目标路径可以是字符串（其中 $N 表示匹配的模式)。
 * @returns this 
 */
BuildRule.prototype.dest = function (path) {
    this.destPath = path === null ? '' : path;
    return this;
};

/**
 * 使用当前规则匹配指定的路径。
 * @param {String} path 要匹配的路径。
 * @return {Array|Boolean} 返回匹配之后的目标路径。如果返回空字符串表示匹配但目标路径为空，如果不匹配则返回 @null。
 */
BuildRule.prototype.match = function (path) {
    if (this.ignored(path)) {
        return null;
    }
    if (!this._srcPathFilter) {
        this._srcPathFilter = createPathFilter(this.srcPath);
    }
    return this._srcPathFilter(path, this.destPath);
};

exports.BuildRule = BuildRule;

// #endregion

// #region createPathFilter

/**
 * 判断一个路径是否是通配符路径。
 * @param {} path 
 * @returns {} 
 */
function isSpecifiedPath(path) {
    if (Array.isArray(path)) {
        return path.every(isSpecifiedPath);
    }
    
    return typeof path === "string" && !/[\*\?]/.test(path);
}

/**
 * 返回一个用于过滤指定路径的过滤器。
 * @param {mixed} filter 过滤器。可以是通配字符串、正则表达式、函数、空(表示符合任何条件)或以上过滤器组合的数组。
 * @returns {Function} 返回一个过滤器函数。此函数的参数为：
 * * @param {String} path 要测试的路径。
 * * @param {Array} [dest] 重定向的目标路径（其中 $n 会被替换为源路径的匹配部分)。
 * * @return {String 如果返回 @null 则表示不符合当前过滤器，否则返回最终重定向的目标路径。如果未指定 @dest 则返回 @path。
 */
function createPathFilter(filter) {
    
    // createPathFilter([...])
    if (typeof filter === "object") {
        if (filter.length > 1) {
            var newFilter = [];
            for (var i = 0; i < filter.length; i++) {
                newFilter[i] = createPathFilter(filter[i]);
            }
            
            return function (path, dest) {
                for (var i = 0; i < newFilter.length; i++) {
                    var result = newFilter[i].call(this, path, dest);
                    if (result !== null) {
                        return result;
                    }
                }
                return null;
            };
        }
        return createPathFilter(filter[0]);
    }
    
    // createPathFilter("*.*")
    if (typeof filter == "string") {
        filter = new RegExp("^" + filter.replace(/([-.+^${}|[\]\/\\])/g, '\\$1').replace(/\*/g, "(.*)").replace(/\?/g, "([^/])") + "(\/|$)", "i");
    }
    
    // createPathFilter(/.../)
    if (filter instanceof RegExp) {
        return function (path, dest) {
            var match = filter.exec(path);
            return match ? dest != undefined ? dest.replace(/\$(\d+)/g, function (all, n) {
                return n in match ? match[n] : all;
            }) : path : null;
        };
    }
    
    // createPathFilter(function(){ ... })
    if (filter instanceof Function) {
        return function (path, dest) {
            var match = filter.apply(this, arguments);
            return match === true ? dest == undefined ? path : dest : match === false ? null : match;
        };
    }
    
    // createPathFilter()
    return function () {
        return null;
    };

}

exports.createPathFilter = createPathFilter;

// #endregion
