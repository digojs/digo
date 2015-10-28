/**
 * @fileOverview 构建逻辑核心。
 */

var Path = require('path');
var FS = require('fs');
var IO = require('tealweb/io');
var Lang = require('tealweb/lang');

// #region Builder

// #region 核心

/**
 * 表示一个构建器。
 * @class
 */
function Builder() {
    this.rules = [];
    this.ignores = [];
    this.errors = [];
    this.files = { __proto__: null };
    this.fileCount = 0;
}

/**
 * 当前构建器的源路径。
 */
Builder.prototype._srcPath = "";

/**
 * 获取当前构建器的源路径。
 */
Builder.prototype.__defineGetter__('srcPath', function () {
    return this._srcPath || Path.resolve();
});

/**
 * 设置当前构建器的源路径。
 */
Builder.prototype.__defineSetter__('srcPath', function (value) {
    this._srcPath = Path.resolve(value);
});

/**
 * 当前构建器的目标路径。
 */
Builder.prototype._destPath = "";

/**
 * 获取当前构建器的目标路径。
 */
Builder.prototype.__defineGetter__('destPath', function () {
    return this._destPath || this.srcPath;
});

/**
 * 设置当前构建器的目标路径。
 */
Builder.prototype.__defineSetter__('destPath', function (value) {
    this._destPath = Path.resolve(value);
});

/**
 * 所有绝对路径的根路径。即项目中路径“/”所表示的实际位置。
 */
Builder.prototype._rootPath = "";

/**
 * 获取当前构建器的根路径。即项目中路径“/”所表示的实际位置。
 */
Builder.prototype.__defineGetter__('rootPath', function () {
    return this._rootPath || Path.srcPath;
});

/**
 * 设置当前构建器的根路径。即项目中路径“/”所表示的实际位置。
 */
Builder.prototype.__defineSetter__('rootPath', function (value) {
    this._rootPath = Path.resolve(value);
});

/**
 * 所有绝对路径的根地址。即项目中路径“/”所表示的实际网址。
 */
Builder.prototype._rootUrl = "/";

/**
 * 获取当前构建器的根地址。即项目中路径“/”所表示的实际网址。
 */
Builder.prototype.__defineGetter__('rootUrl', function () {
    return this._rootUrl;
});

/**
 * 设置当前构建器的根地址。即项目中路径“/”所表示的实际网址。
 */
Builder.prototype.__defineSetter__('rootUrl', function (value) {
    this._rootUrl = value.replace(/[^\/]$/, "$&/");
});

/**
 * 获取或设置当前构建器读写文件使用的编码。
 */
Builder.prototype.encoding = "utf-8";

/**
 * 获取或设置当前构建器是否启用调试。
 */
Builder.prototype.verbose = false;

/**
 * 获取指定路径的名称。如 a/b.jpg
 * @param {String} path 要处理的路径。
 */
Builder.prototype.getName = function (path) {
    return Path.relative(this.srcPath, path).replace(/\\/g, "/");
};

/**
 * 获取指定名称对应的路径。如 E:/a/b.jpg
 * @param {String} name 要处理的名称。
 */
Builder.prototype.getPath = function (name) {
    return Path.join(this.srcPath, name);
};

/**
 * 创建包含和当前构建器相同配置的子构建器。
 * @return {Builder}
 */
Builder.prototype.createChildBuilder = function () {
    var result = new Builder();
    result.parentBuilder = result.__proto__ = this;
    result.rules = this.rules.slice(0);
    result.ignores = this.ignores.slice(0);
    return result;
};

// #endregion

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
 * 获取或设置当前构建器的日志等级。
 */
Builder.prototype.logLevel = Builder.LOG_LEVEL.log;

/**
 * 存储各消息的本地翻译版本。
 */
Builder.prototype.messages = { __proto__: null };

/**
 * 当被子类重写时，负责自定义输出日志的方式（如需要将日志保存为文件）。
 * @param {String} message 要输出的信息。 
 * @param {Number} logLevel 要输出的日志等级。
 */
Builder.prototype.write = function (message, logLevel) {
    var formator = [0, '\033[49;31;1m#\033[0m', '\033[49;33;1m#\033[0m', '\033[49;32;1m#\033[0m', '\033[36m#\033[0m', '\033[32m#\033[0m'][logLevel];
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

// #region 公开接口

/**
 * 底层使用的忽略过滤器。
 * @param {String} name 要判断的文件或文件夹名称。
 * @returns {String} 如果已忽略则返回 @null，否则返回 @name。
 */
Builder.prototype._ignoredFilter = function () { return null; };

/**
 * 添加一个忽略项。
 * @param {String|RegExp|Function|Null} ... 要忽略的文件或文件夹路径。支持通配符、正则表达式或函数表达式。
 * @returns this 
 */
Builder.prototype.ignore = function () {
    this.ignores.push.apply(this.ignores, arguments);
    this._ignoredFilter = createPathFilter(this.ignores);
    return this;
};

/**
 * 判断指定路径是否被忽略。
 * @param {String} path 要判断的文件或文件夹路径。
 * @returns {Boolean} 如果已忽略则返回 @true，否则返回 @false。
 */
Builder.prototype.ignored = function (path) {
    return this._ignoredFilter(this.getName(path)) !== null;
};

/**
 * 添加针对指定路径的处理规则。
 * @param {String|RegExp|Function|Null} ... 要处理的文件路径。支持通配符、正则表达式或函数表达式。
 * @returns {BuildRule} 返回一个处理规则，可针对此规则进行具体的处理方式的配置。
 */
Builder.prototype.src = function () {
    var rule = new BuildRule(arguments);
    this.rules.push(rule);
    return rule;
};

/**
 * 遍历当前项目内所有未被忽略的文件并执行 @callback。
 * @param {Function} callback 要执行的回调。其参数为：
 * * @param {String} path 要处理文件的路径。
 * * @param {String} name 要处理文件的名称。
 * @returns {} 
 */
Builder.prototype.walk = function (callback) {
    var builder = this;
    IO.walkDir(this.srcPath, function (name, isDir) {

        // 判断路径是否被忽略。
        if (builder._ignoredFilter(name) !== null) {
            return false;
        }

        // 将文件加入到待编译列表。
        if (!isDir) {
            callback.call(builder, builder.getPath(name), name);
        }

    });
};

/**
 * 获取指定规则匹配到的所有文件。
 * @param {String} path 要处理的路径。
 * @returns {String} 返回不含绝对路径的部分。
 */
Builder.prototype.getFilesByRule = function (rule) {

    // 特定的规则直接获取对应文件列表。
    if (isSpecifiedPath(rule.srcPath)) {
        return rule.srcPath.map(this.getPath, this);
    }

    var result = [];
    this.walk(function (path, name) {
        if (rule.match(name) !== null) {
            result.push(path);
        }
    });
    return result;
};

/**
 * 根据指定过滤器返回匹配的文件列表。
 * @param {String|RegExp|Function|Null} ... 要忽略的文件或文件夹路径。支持通配符、正则表达式或函数表达式。
 * @returns {} 
 */
Builder.prototype.getFiles = function () {
    return this.getFilesByRule(new BuildRule(arguments));
};

// #endregion

// #region 生成

/**
 * 根据当前设置的规则生成整个项目。
 * @param {Boolean} [clean] 指示是否在生成前清理文件夹。默认为自动清理。
 * @returns {Number} 返回本次最终生成的文件数。 
 */
Builder.prototype.build = function (clean) {

    // 1. 准备工作。
    this.info("Start Building...");
    this.info("{srcPath} -> {destPath}", this);

    if (clean == null ? this.srcPath.indexOf(this.destPath) < 0 : clean) {
        this.debug("> Cleaning...", this);
        try {
            IO.cleanDir(this.destPath);
        } catch (e) { }
    }

    // 2. 生成所有文件。
    this.debug("> Processing Files...", this);
    this.files = { __proto__: null };
    this.fileCount = 0;

    // 遍历项目并直接生成。
    this.walk(this.buildFile);

    // 3. 执行一次性规则。
    for (var i = 0; i < this.rules.length; i++) {
        if (!this.rules[i].srcPath.length) {
            var file = this.files["#Generated_" + i] = new BuildFile(this, "", "", "");
            var lastErrorCount = this.errors.length;
            this.processCore(file, this.rules[i], this.rules[i].destPath);
            this.errors.length === lastErrorCount && file.save() && this.fileCount++;
        }
    }

    // 4.输出结果。
    var fileCount = this.fileCount;
    var errorCount = this.errors.length;
    if (fileCount > 0) {
        this.info("{srcPath} -> {destPath}", this);
    }

    if (errorCount) {
        this.error("Build Completed! ({0} files saved, {1} error(s) found)", fileCount, errorCount);
    } else {
        this.success("Build Success! ({0} files saved)", fileCount, errorCount);
    }

    return fileCount;
};

/**
 * 根据当前设置的规则生成指定文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [name] 要处理文件的名称。
 * @param {String} [content] 如果是虚拟文件，则手动指定文件的内容。
 * @param {Boolean} [save] 指示是否保存生成的文件。默认为自动保存非虚拟文件。
 */
Builder.prototype.buildFile = function (path, name, content) {
    var file = new BuildFile(this, path, name, content);
    this.processFile(file) && file.save() && this.fileCount++;
    return file;
};

/**
 * 底层处理指定的文件。
 * @param {BuildFile} file 要处理文件。
 * @returns {Boolean} 如果处理成功则返回 @true，否则返回 @false。
 */
Builder.prototype.processFile = function (file) {

    // 保存文件路径。
    this.files[file.path] = file;

    var lastErrorCount = this.errors.length;

    // 依次执行所有适用的规则。
    for (var i = 0; i < this.rules.length; i++) {
        var destName = this.rules[i].match(file.name);
        if (destName !== null) {
            this._processFileCore(file, this.rules[i], destName);
        }
    }

    return this.errors.length === lastErrorCount;

};

/**
 * 根据指定的规则处理指定的文件。
 * @param {BuildFile} file 要处理的文件。
 * @param {BuildRule} rule 要使用的规则。
 * @param {String} destName 生成的目标文件名。
 */
Builder.prototype._processFileCore = function (file, rule, destName) {
    
    file.processed = true;
    file.prevPath = file.destPath;
    file.destPath = destName && Path.join(this.destPath, destName);

    // 根据当前规则更新文件的最终内容。
    for (var i = 0; i < rule.processors.length; i++) {
        var options = { __proto__: rule.processorOptions[i] };
        if (this.verbose) {
            file.content = rule.processors[i].call(rule, file, options, this);
        } else {
            try {
                file.content = rule.processors[i].call(rule, file, options, this);
            } catch (e) {
                this.error("{0}: Uncaught Error: {1}", file.srcPath, e.message);
                break;
            }
        }
    }

};

/**
 * 获取指定路径对应的文件实例。如果文件未生成则提前生成。
 * @param {String} path 要获取的文件路径。
 * @returns {BuildFile} 返回对应的文件实例。如果文件未生成则先生成，否则返回已生成的文件。 
 */
Builder.prototype.getFile = function (path) {
    return this.files[path] || this.buildFile(path);
};

/**
 * 添加一个已生成的文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} content 如果是虚拟文件，则手动指定文件的内容。
 */
Builder.prototype.addFile = function (path, content) {
    return this.buildFile(path, null, content);
};

/**
 * 添加一个已生成的文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [content] 如果是虚拟文件，则手动指定文件的内容。
 */
Builder.prototype.createFile = function (path, content) {
    return new BuildFile(this, path, null, content);
};

/**
 * 当生成失败时调用。
 * @param {} file 
 * @returns {} 
 */
Builder.prototype.reportError = function (file, error, message, path, line, column, prefix) {

    path = path || file.srcPath;
    if (line != null) {
        path += '(' + line;
        if (column != null) {
            path += ', ' + column;
        }
        path += ')';
    }

    this.error("{0}: {1}", path, message || error.message || error);

    if (prefix != null) {
        file.content = String.format("/*\r\n\
\r\n\
\t{2}: \r\n\
\t\t{1}\r\n\
\t\tAt {0)\r\n\
\r\n\
*/\r\n\r\n", path, message, prefix) + file.content;
    };

    if (this.verbose) {
        throw error;
    }

};

// #endregion

// #region 监听

/**
 * 监听当前项目的改动并实时生成。
 */
Builder.prototype.watch = function (dirName) {
    var builder = this;
    var watcher = watchDir(dirName ? Path.join(this.srcPath, dirName) : this.srcPath, function (path) {
        var name = builder.getName(path);
        if (builder.ignored(name)) {
            return false;
        }

        // 判断是否符合任一规则。
        for (var i = 0; i < builder.rules.length; i++) {
            if (builder.rules[i].match(name) !== null) {
                return true;
            }
        }

        return false;
    }, function (path) {
        builder.buildFile(path);
    });
    this.info("Watching {0}...", this.srcPath);
    return watcher;
};

function watchDir(path, filter, callback) {
    var watcher = require('chokidar').watch(path).on('change', callback);
    watcher._isIgnored = filter;
    return watcher;
}

// #endregion

// #region 服务器

/**
 * 启用可在响应时自动处理当前规则的服务器。
 * @param {String|Number} port 服务器地址或端口。 
 */
Builder.prototype.startServer = function (port) {
    var builder = this;
    var server = new (require('aspserver').HttpServer)({
        port: port,
        physicalPath: this.srcPath,
        modules: {
            buildModule: {
                processRequest: function (context) {

                    // 生成当前请求相关的文件。
                    var file = new BuildFile(builder, context.request.physicalPath);
                    builder.processFile(file);

                    // 如果当前路径被任一规则处理，则响应处理后的结果。
                    if (file.processed) {
                        context.response.contentType = server.mimeTypes[file.extension];
                        context.response.write(file.data);
                        context.response.end();
                        return true;
                    }

                    return false;
                }
            }
        },
        mimeTypes: this.mimeTypes
    });

    server.on('start', function () {
        builder.info("Server Running At {rootUrl}", this);
    });

    server.on('stop', function () {
        builder.info("Server Stopped At {rootUrl}", this);
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
 * @param {Builder} [name] 当前文件的名称。
 * @param {Builder} [content] 当前文件的内容。
 * @class
 */
function BuildFile(builder, path, name, content) {
    this.builder = builder;
    this.srcPath = path;
    this.name = name || builder.getName(path);
    this.content = content;
    this.dependencies = [];
}

BuildFile.prototype._contentUpdated = false;

/**
 * 获取或设置当前文件的原始路径。
 * @type {String}
 */
BuildFile.prototype.srcPath = "";

/**
 * 获取当前文件的目标路径。
 * @type {String}
 * @name destPath
 */
BuildFile.prototype.destPath = "";

/**
 * 获取当前文件的名称。
 */
BuildFile.prototype.__defineGetter__('name', function () {
    return this._destName;
});

/**
 * 设置当前文件的名称。
 */
BuildFile.prototype.__defineSetter__('name', function (value) {
    this._destName = value;
    this.destPath = Path.join(this.builder.destPath, value);
});

/**
 * 获取当前文件的最终路径。
 */
BuildFile.prototype.__defineGetter__('path', function () {
    return this.destPath;
});

/**
 * 设置当前文件的最终路径。
 */
BuildFile.prototype.__defineSetter__('path', function (value) {
    this.destPath = value;
    this._destName = value && this.builder.getName(value);
});

/**
 * 获取当前文件的最终文本内容。
 * @type {String}
 */
BuildFile.prototype.__defineGetter__('content', function () {
    if (this._content == undefined) {
        this._content = this._buffer ? this._buffer.toString(this.builder.encoding) : this.load(this.builder.encoding);
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
});

/**
 * 获取当前文件的源文件夹路径。
 */
BuildFile.prototype.__defineGetter__('srcDirPath', function () {
    return Path.dirname(this.srcPath);
});

/**
 * 获取当前文件的目标文件夹路径。
 */
BuildFile.prototype.__defineGetter__('destDirPath', function () {
    return Path.dirname(this.destPath);
});

/**
 * 判断当前文件是否实际存在。
 * @type {Buffer}
 */
BuildFile.prototype.__defineGetter__('exists', function () {
    return this.srcPath && IO.existsFile(this.srcPath);
});

/**
 * 获取当前文件的扩展名。
 */
BuildFile.prototype.__defineGetter__('extension', function () {
    return Path.extname(this.path);
});

/**
 * 从硬盘载入当前文件的内容。
 * @param {String} [encoding] 解析文本内容的编码。
 * @return {String|Buffer} 如果指定了编码则返回文件文本内容，否则返回文件数据。
 */
BuildFile.prototype.load = function (encoding) {
    var srcPath = this.srcPath;
    try {
        return encoding ? IO.readFile(srcPath, encoding) : IO.existsFile(srcPath) ? FS.readFileSync(srcPath) : new Buffer(0);
    } catch (e) {
        this.builder.warn("{0}: Cannot Read File: {1}", srcPath, e);
        return '';
    }
};

/**
 * 保存当前文件内容。
 * @return {Boolean} 如果成功保存则返回 @true，否则返回 @false。
 */
BuildFile.prototype.save = function () {

    // 如果目标路径为 null，表示删除文件。
    if (!this.destPath) {
        this.builder.log("D {0}", this.srcPath);
        return false;
    }

    // 获取目标保存路径。
    var destPath = this.destPath;

    // 内容发生改变则存储文件。
    if (this._contentUpdated) {
        try {
            IO.ensureDir(destPath);
            if (this._buffer != undefined) {
                FS.writeFileSync(destPath, this._buffer);
            } else {
                FS.writeFileSync(destPath, this._content, this.builder.encoding);
            }

            this.builder.log(this.srcPath === this.destPath ? "U {0}" : this.srcPath ? "M {0} -> {1}" : "A {1}", this.srcPath, this.destPath);
        } catch (e) {
            this.builder.error("{0}: Cannot Write File: {1}", destPath, e);
        }
        return true;
    }

    // 仅路径改变则简单复制文件。
    var srcPath = this.srcPath;
    if (srcPath !== destPath) {
        try {
            IO.copyFile(srcPath, destPath);
            this.builder.log(this.srcPath === this.destPath ? "A {1}" : "C {0} -> {1}", this.srcPath, this.destPath);
        } catch (e) {
            this.builder.error("{0}: Cannot Copy File: {1}", destPath, e);
        }
        return true;
    }

    return false;
};

BuildFile.prototype.valueOf = function() {
     return this.path;
};

BuildFile.prototype.toString = function() {
     return this.content;
};

/**
 * 获取当前文件内指定相对路径表示的实际路径。
 * @param {String} relativePath 要处理的绝对路径。如 ../a.js
 */
BuildFile.prototype.resolvePath = function (relativePath) {
    relativePath = relativePath || '';
    return (/^\//.test(relativePath) ? Path.join(this.builder.rootPath + relativePath) : Path.join(Path.dirname(this.srcPath), relativePath));
};

/**
 * 获取在当前文件内引用指定路径所使用的相对路径。
 * @param {String} path 要处理的路径。如 styles/test.css（注意不能是绝对路径）
 */
BuildFile.prototype.relativePath = function (path) {
    return Path.relative(Path.dirname(this.destPath), path).replace(/\\/g, '/');
};

/**
 * 获取在当前文件内引用指定路径所使用的相对路径。
 * @param {String} path 要处理的路径。如 styles/test.css（注意不能是绝对路径）
 */
BuildFile.prototype.createPathPlaceholder = function (path) {
    this._hasPathPlaceholder = true;
    return 'file:///' + path + '#';
};

/**
 * 获取在当前文件内引用指定路径所使用的相对路径。
 * @param {String} path 要处理的路径。如 styles/test.css（注意不能是绝对路径）
 */
BuildFile.prototype.replacePlaceholder = function () {
    if (this._hasPathPlaceholder) {
        this._hasPathPlaceholder = false;
        var file = this;
        this.content = this.content.replace(/file:\/\/\/(.*?)#/g, function(path) {
            return file.relativePath(path);
        });
    }
};

/**
 * 获取当前文件的所有依赖项（包括直接依赖和间接依赖）
 * @returns {Array} 返回由各依赖的 BuildFile 组成的数组。 
 */
BuildFile.prototype.getAllDeps = function () {
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
BuildFile.prototype.hasDep = function (file) {
    return this.getAllDependencies().indexOf(file) >= 0;
};

/**
 * 添加当前文件的依赖项。
 * @param {String} relativePath 相当于当前文件的相对路径。
 * @param {String} [content] 如果是虚拟文件，则手动指定文件的内容。
 */
BuildFile.prototype.addDep = function (relativePath, content) {
    var file = this.builder.buildFile(this.resolvePath(relativePath), content);
    if (content == null && !file.exists) {
        this.builder.warn("{0}: Reference Not Found: {1}", this.srcPath, relativePath);
    }
    this.dependencies.push(file);
    return file;
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
    this.processorOptions.push(processorOptions);
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
