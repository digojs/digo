/**
 * @fileOverview 提供构建工具的基础功能。
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
    var formator = [0, '\033[49;31;1m#\033[0m', '\033[49;30;1m#\033[0m', '\033[49;32;1m#\033[0m', '\033[32mm#\033[0m', '\033[32m#\033[0m'][logLevel];
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
 * 调试输出信息。
 * @param {Object} ... 要输出的信息。 
 */
Builder.prototype.debug = function () {
    return this.logLevel >= Builder.LOG_LEVEL.debug && console.log.apply(console, arguments);
};

// #endregion

// #region 配置

/**
 * 获取或设置当前构建工具的基础路径。
 * @name basePath
 */

/**
 * 获取或设置当前构建工具的日志等级。
 */
Builder.prototype.logLevel = Builder.LOG_LEVEL.log;

/**
 * 获取或设置当前构建工具的默认编码。
 */
Builder.prototype.encoding = "utf-8";

/**
 * 获取或设置当前构建工具的是否自动保存生成的文件。
 */
Builder.prototype.autoFlush = false;

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
    if (this.ignores)[].push.apply(this.ignores, arguments);
    else this.ignores = [].slice.call(arguments);
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

// #endregion

// #region 对外接口

/**
 * 获取指定路径的完整路径。
 * @param {String} path 要获取的路径。
 */
Builder.prototype.getFullPath = function (path) {
    if (this.basePath == undefined) {
        this.basePath = process.cwd();
    }
    return Path.resolve(this.basePath + '/./' + path);
};

/**
 * 获取指定路径的简短路径。
 * @param {String} fullPath 要获取的完整路径。
 */
Builder.prototype.getPath = function (fullPath) {
    if (/^\/|\:/.test(fullPath))
        return Path.relative(this.basePath, fullPath).replace(/\\/g, "/");
    return fullPath;
};

/**
 * 清空构建器缓存。
 */
Builder.prototype.reset = function () {
    delete this.files;
    this.errors.length = 0;
};

/**
 * 获取所有文件。
 * @returns {Object} 返回所有文件列表。 
 */
Builder.prototype.getFiles = function () {
    if (!this.files) {
        this.files = {};
        IO.walkDir(this.getFullPath('.'), function (path, isDir) {

            // 路径是否被忽略。
            if (this.ignored(path)) {
                return false;
            }

            // 将文件加入到待编译列表。
            if (!isDir) {
                this.files[path] = new BuildFile(this, path);
            }

        }.bind(this));
    }
    return this.files;
};

/**
 * 添加一个已生成的文件。
 * @returns {} 
 */
Builder.prototype.addFile = function (path, content) {
    this.files[path] = new BuildFile(this, path, content);
};

/**
 * 清空指定文件夹。
 * @param {String} folder 要清空的文件夹。
 */
Builder.prototype.clean = function (folder) {
    IO.cleanDir(this.getFullPath(folder));
};

/**
 * 开始处理项目中符合指定路径的文件。
 * @param {Object} ... 要处理的文件路径。支持通配符、正则表达式或函数表达式。
 * @returns {BuildTask} 返回一个生成任务。
 */
Builder.prototype.src = function () {
    return new BuildTask(this, arguments);
};

/**
 * 添加一个已生成的文件。
 */
Builder.prototype.flush = function () {
    var fileCount = this.fileCount || 0;
    for (var file in this.files) {
        if (this.files[file].save()) {
            fileCount++;
        }
    }
    return this.fileCount = fileCount;
};

/**
 * 获取指定文件的当前生成结果。
 * @returns {BuildFile} 返回指定文件。 
 */
Builder.prototype.getFile = function (path) {
    path = this.getPath(path);
    return this.files[path];
};

// #endregion

module.exports = Builder;

// #endregion

// #region BuildFile

/**
 * 表示一个生成文件。一个生成文件可以是一个物理文件或虚拟文件。
 * @class
 */
function BuildFile(builder, path, content) {
    this.builder = builder;
    this.src = this.path = path;
    this.content = content;
}

/**
 * 获取或设置当前文件的路径。
 * @name path
 */

/**
 * 获取当前文件的完整路径。
 */
BuildFile.prototype.__defineGetter__('fullPath', function () {
    return Path.resolve(this.builder.basePath + '/./' + this.path);
});

/**
 * 获取当前文件的文本内容。
 */
BuildFile.prototype.__defineGetter__('content', function () {
    if (this._content == undefined) {
        this._content = this._buffer ? this._buffer.toString(this.builder.encoding) : this.load(this.builder.encoding);
    }
    return this._content;
});

/**
 * 设置当前文件的文件内容。
 */
BuildFile.prototype.__defineSetter__('content', function (value) {
    if (Array.isArray(value)) {
        this._content = value[0];
        this._buffer = null;
        this._contentUpdated = true;
        this.contents = value;
        //if (this.relatedFiles) {
        //    for (var i = 0; i < this.relatedFiles.length; i++) {
        //        this.relatedFiles[i].content = value[i];
        //    }
        //}
    } else if (value != undefined) {
        this._content = value;
        this._buffer = null;
        this._contentUpdated = true;
    }
});

/**
 * 获取当前文件的二进制内容。
 */
BuildFile.prototype.__defineGetter__('buffer', function () {
    if (this._buffer == undefined) {
        this._buffer = this._content != undefined ? new Buffer(this._content) : this.load();
    }
    return this._buffer;
});

/**
 * 设置当前文件的二进制内容。
 */
BuildFile.prototype.__defineSetter__('buffer', function (value) {
    this._buffer = value;
    this._content = null;
    this._contentUpdated = true;
});

/**
 * 获取当前路径相对于指定基路径的相对路径。
 */
BuildFile.prototype.relative = function (path) {
    return Path.relative(Path.dirname(path), this.fullPath).replace(/\\/g, '/');
};

/**
 * 保存当前文件内容。
 */
BuildFile.prototype.save = function () {
    if (this._contentUpdated) {
        var path = this.fullPath;
        if (this._buffer != undefined) {
            IO.ensureDir(path);
            FS.writeFileSync(path, this._buffer);
        } else {
            IO.writeFile(path, this._content, this.builder.encoding);
        }
        this._contentUpdated = false;
        return true;
    }

    if (this.path !== this.src) {
        IO.copyFile(Path.resolve(this.builder.basePath + '/./' + this.src), this.fullPath);
        this.src = this.path;
        return true;
    }

    return false;
};

/**
 * 载入当前文件。
 */
BuildFile.prototype.load = function (encoding) {
    var path = Path.resolve(this.builder.basePath + '/./' + this.src);
    return encoding ?
        IO.existsFile(path) ? IO.readFile(path, encoding) : '' :
        IO.existsFile(path) ? FS.readFileSync(path) : new Buffer();
};

BuildFile.prototype.valueOf = function () {
    return this.src;
};

BuildFile.prototype.toString = function () {
    return this.content;
};

exports.BuildFile = BuildFile;

// #endregion

// #region BuildTask

/**
 * 表示一个生成任务。
 * @param {Builder} builder 当前使用的构建器。
 * @param {Array} filter 要处理的文件夹路径集合。支持通配符、正则表达式或函数表达式组成的数组。
 * @class
 */
function BuildTask(builder, filter) {
    this.builder = builder;
    this.filter = filter = createPathFilter(filter);

    // 遍历项目所有文件夹，找到匹配的文件。
    this.files = [];
    var files = this.builder.getFiles();
    for (var fileName in files) {
        var file = files[fileName];
        if (filter(file.path)) {
            this.files.push(file);
        }
    }

}

/**
 * 忽略待处理文件中的若干文件。
 * @param {Object} ... 要忽略的文件或文件夹路径。支持通配符、正则表达式或函数表达式。
 * @returns this 
 */
BuildTask.prototype.ignore = function () {
    var filter = createPathFilter(arguments);
    this.files = this.files.filter(function (file) {
        return filter(file.path);
    });
    return this;
};

/**
 * 使用一个处理器。
 * @param {Function} processor 要使用的处理器。
 * @param {Object} [processOptions] 传递给处理器的配置对象。
 * @returns this 
 */
BuildTask.prototype.pipe = function (processor, processorOptions) {
    if (!(processor instanceof Function)) throw "processor 必须是函数";
    processorOptions = processorOptions || Object.create(null);

    for (var files = this.files, i = 0; i < files.length; i++) {
        var file = files[i];

        // 出现错误不继续处理。
        if (file.hasError) {
            continue;
        }

        if (this.builder.logLevel >= Builder.LOG_LEVEL.debug) {
            file.content = processor.call(this, file, processorOptions, this.builder);
        } else {
            try {
                file.content = processor.call(this, file, processorOptions, this.builder);
            } catch (e) {
                file.hasError = true;
                this.builder.error("{0}: {1}", file.path, e.message);
            }
        }

        // 应用任务中断条件。
        if (this['break']) {
            delete this['break'];
            break;
        }

    }

    return this;
};

/**
 * 添加一个目标路径。
 * @param {String} ... 要设置的目标路径。目标路径可以是字符串（其中 $N 表示匹配的模式)或函数表达式。
 * @returns this 
 */
BuildTask.prototype.dest = function () {

    var taskDests = [].slice.call(arguments);

    for (var files = this.files, i = 0; i < files.length; i++) {
        var file = files[i];

        // 出现错误不继续处理。
        if (file.hasError) {
            continue;
        }

        var dests = this.filter(file.path, taskDests);
        if (!dests) throw "出现不合法路径：" + file.path;

        // 更新文件路径。
        file.path = dests[0];

        // 添加副产物。
        for (var j = 1; j < dests.length; j++) {
            this.builder.addFile(dests[j], file.contents && file.contents[j] || '');
        }

        this.builder.log("+ {path}", file);

    }

    // 保存生成的文件。
    if (this.builder.autoFlush) {
        this.builder.flush();
    }

    return this;
};

exports.BuildTask = BuildTask;

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
 * * @return {String|Boolean} 如果返回 @false 则表示不符合当前过滤器，否则返回最终生效的目标路径。如果未指定 @dest 则返回 @true。
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
                    var result = newFilter[i](path, dest);
                    if (result !== false) {
                        return result;
                    }
                }
                return false;
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
            if (match) {
                return dest ? dest.map(function (dest) {
                    return dest.replace(/\$(\d+)/g, function (all, n) {
                        return n in match ? match[n] : all;
                    });
                }) : true;
            }
            return false;
        };
    }

    // createPathFilter(function(){ ... })
    if (filter instanceof Function) {
        return function (path, dest) {
            var match = filter(path, dest);
            if (match) {
                return match !== true ? match : dest ? dest : true;
            }
            return false;
        };
    }

    // createPathFilter()
    return function (path, dest) {
        return false;
    };

}

exports.createPathFilter = createPathFilter;

// #endregion
