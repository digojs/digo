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
	this.rules = [];
	this.runOnceRules = [];
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
	var formator = [0, '\033[49;31;1m#\033[0m', '\033[49;30;1m#\033[0m', '\033[49;32;1m#\033[0m', '\033[32m#\033[0m', '\033[32m#\033[0m'][logLevel];
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
	if (this.ignores) [].push.apply(this.ignores, arguments);
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

/**
 * 添加针对指定路径的处理规则。
 * @param {Object} ... 要处理的文件路径。支持通配符、正则表达式或函数表达式。
 * @returns {BuildRule} 返回一个生成任务。
 */
Builder.prototype.src = function () {
	var rule = new BuildRule(arguments);
	if (rule.srcs.length > 0) {
		this.rules.push(rule);
	} else {
		this.runOnceRules.push(rule);
	}
	return rule;
};

/**
 * 清空构建器缓存。
 */
Builder.prototype.clear = function () {
	delete this.files;
	this._ignoreFilter = null;
	this.rules.length = 0;
	this.runOnceRules.length = 0;
	this.ignores.length = 0;
	this.errors.length = 0;
};

// #endregion

// #region 生成

/**
 * 生成当前项目。
 * @param {String} [dest] 设置生成文件的目标保存路径。默认为当前文件夹。
 * @param {String} [clean] 设置是否在生成前清理文件夹。默认为自动清理。
 * @returns {Number} 返回生成结果。 
 */
Builder.prototype.build = function (dest, clean) {
	this.info("Start Building...", this);
	
	// 处理路径。
	this.srcFullPath = Path.resolve(this.getFullPath('.'));
	this.destFullPath = Path.resolve(this.src, dest);
	
	this.info("{srcFullPath} -> {destFullPath}", this);
	
	// 清理目标文件夹。
	if (clean == null ? this.srcFullPath.indexOf(this.destFullPath) < 0 : clean) {
		this.debug("> Cleaning...", builder);
		IO.cleanDir(this.destPath);
	}
	this.files = Object.create(null);
	
	// 处理所有文件。
	this.debug("> Processing...");
	IO.walkDir(this.srcFullPath, function (path, isDir) {
		
		// 路径是否被忽略。
		if (this.ignored(path)) {
			return false;
		}
		
		// 将文件加入到待编译列表。
		if (!isDir) {
			this.process(path);
		}

	}.bind(this));
	
	// 执行一次性任务。
	if (this.runOnceRules.length > 0) {
		this.debug("> Run run-once rules...");
		for (var i = 0; i < this.runOnceRules.length; i++) {
			var file = this.files["#Generated_" + i] = new BuildFile(this, "#Generated_" + i, "");
			file.dest = file.path = this.runOnceRules[i].destPath;
			this.processFileWithRule(file, this.runOnceRules[i]);
		}
	}
	
	// 保存文件。
	this.debug("> Saving Files...");
	var fileCount = 0;
	for (var path in this.files) {
		if (this.files[path].save()) {
			fileCount++;
		}
	}
	
	// 输出结果。
	var errorCount = this.errors.length;
	if (errorCount) {
		this.error("Build Completed! ({0} files updated, {1} error(s) found)", fileCount, errorCount);
	} else {
		this.success("Build Success! ({0} files updated)", fileCount, errorCount);
	}
	
	this.info("{srcFullPath} -> {destFullPath}", this);

	return fileCount;
};

/**
 * 处理指定的文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [content] 手动指定文件的内容。
 * @param {Boolean} [tmpFile=false] 指示是否将当前文件是否是临时文件。
 * @return {BuildFile} 返回文件信息。
 */
Builder.prototype.process = function (path, content, tmpFile) {
	
	// 如果文件已处理过则不重复处理，未处理的文件遍历所有规则处理。
	var file = this.files[path];
	if (!file) {
		file = new BuildFile(this, path, content);
		
		// 指示是否是临时文件。
		if (!tmpFile) {
			this.files[path] = file;
		}
		
		var success = false;
		
		// 依次应用每个规则。
		for (var i = 0; i < this.rules.length; i++) {
			var rule = this.rules[i];
			
			// 判断指定规则是否可用于当前文件路径。同时获取当前规则的发布结果。
			var dest = rule.match(file.path);
			if (dest) {
				file.path = file.dest = dest;
				success = success && this.processFileWithRule(file, rule);
				// 应用规则中断条件。
				if (rule['break']) {
					break;
				}
			}

		}
		
		success && this.log("{0} -> {1}", path, file.path);
	
	}
	return file;
};

/**
 * 基于指定规则处理指定的文件。
 * @param {BuildFile} file 要处理的文件。
 * @param {BuildRule} rule 要使用的规则。
 */
Builder.prototype.processFileWithRule = function (file, rule) {

	// 根据当前规则更新文件的最终内容。
	for (var i = 0; i < rule.processors.length; i++) {
		if (this.verbose) {
			file.content = rule.processors[i].call(rule, file, rule.processorOptions[i], this);
		} else {
			try {
				file.content = rule.processors[i].call(rule, file, rule.processorOptions[i], this);
			} catch (e) {
				this.error("{0}: {1}", file.src, e.message);
				return false;
			}
		}
	}
	return true;
};

/**
 * 获取指定路径的完整路径。如 E:/a/b.jpg
 * @param {String} path 要获取的路径。
 */
Builder.prototype.getFullPath = function (path) {
	if (/^\/|\:/.test(path)) return path;
	if (this.basePath == undefined) {
		this.basePath = process.cwd();
	}
	return Path.resolve(this.basePath + '/' + path);
};

/**
 * 获取指定路径的简短路径。如 a/b.jpg
 * @param {String} fullPath 要获取的完整路径。
 */
Builder.prototype.getPath = function (fullPath) {
	if (/^\/|\:/.test(fullPath))
		return Path.relative(this.basePath, fullPath).replace(/\\/g, "/");
	return fullPath;
};

/**
 * 添加一个已生成的文件。
 * @returns {} 
 */
Builder.prototype.addFile = function (path, content) {
	this.files[path] = new BuildFile(this, path, content);
};

/**
 * 获取指定文件的当前生成结果。
 * @returns {BuildFile} 返回指定文件。 
 */
Builder.prototype.getFile = function (path) {
	return this.files[path];
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
		if (!isDir && rule.match(path)) {
			files.push(path);
		}

	}.bind(this));
	return files;
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
	this.srcPath = this.path = path;
	this.content = content;
}

/**
 * 获取或设置当前文件的最终路径。
 * @name path
 */

/**
 * 获取当前文件的最终文本内容。
 */
BuildFile.prototype.__defineGetter__('content', function () {
	if (this._content == undefined) {
		this._content = this._buffer ? this._buffer.toString(this.builder.encoding) : this.load(this.builder.encoding);
	}
	return this._content;
});

/**
 * 设置当前文件的最终文本内容。
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
 */
BuildFile.prototype.__defineGetter__('buffer', function () {
	if (this._buffer == undefined) {
		this._buffer = this._content != undefined ? new Buffer(this._content) : this.load();
	}
	return this._buffer;
});

/**
 * 设置当前文件的最终二进制内容。
 */
BuildFile.prototype.__defineSetter__('buffer', function (value) {
	this._buffer = value;
	this._content = null;
	this._contentUpdated = true;
});

/**
 * 判断当前文件是否发生改变。
 */
BuildFile.prototype.__defineGetter__('isUpdated', function () {
	return this._contentUpdated || this.path !== this.srcPath;
});

/**
 * 保存当前文件内容。
 * @return {Boolean} 如果成功保存则返回 @true，否则返回 @false。
 */
BuildFile.prototype.save = function () {
	if (this._contentUpdated) {
		var path = this.builder.getFullPath(this.path);
		IO.ensureDir(path);
		if (this._buffer != undefined) {
			FS.writeFileSync(path, this._buffer);
		} else {
			FS.writeFileSync(path, this._content, this.builder.encoding);
		}
		this._contentUpdated = false;
		return true;
	}
	
	if (this.path !== this.srcPath) {
		IO.copyFile(this.builder.getFullPath(this.srcPath), this.builder.getFullPath(this.path));
		this.srcPath = this.path;
		return true;
	}
	
	return false;
};

/**
 * 载入当前文件。
 * @param {String} encoding 解析文本内容的编码。
 */
BuildFile.prototype.load = function (encoding) {
	var srcFullPath = this.builder.getFullPath(this.srcPath);
	return encoding ? IO.readFile(srcFullPath, encoding) : IO.existsFile(srcFullPath) ? FS.readFileSync(srcFullPath) : new Buffer();
};

BuildFile.prototype.valueOf = function () {
	return this.path;
};

BuildFile.prototype.toString = function () {
	return this.content;
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
	return this._ignoreFilter(path);
};

/**
 * 添加一个处理器。
 * @param {Function} processor 要追加的处理器。
 * @param {Object} [processOptions] 传递给处理器的配置对象。
 * @returns this 
 */
BuildRule.prototype.pipe = function (processor, processorOptions) {
	this.processors.push(processor);
	this.processorOptions.push(processorOptions || Object.create(null));
	return this;
};

/**
 * 设置当前规则的目标路径。
 * @param {String} path 要设置的目标路径。目标路径可以是字符串（其中 $N 表示匹配的模式)。
 * @returns this 
 */
BuildRule.prototype.dest = function (path) {
	this.destPath = path;
	return this;
};

/**
 * 使用当前规则匹配指定的路径。
 * @param {String} path 要匹配的路径。
 * @return {Array|Boolean} 返回匹配之后的目标路径。如果无目标路径则返回 @true，如果不匹配则返回 @false。
 */
BuildRule.prototype.match = function (path) {
	
	// 执行路径过滤器。
	var dest = this.srcFilter(path, this.dests);
	
	// 执行忽略规则。
	if (dest && this.ignoreFilter && this.ignoreFilter(path) !== false) {
		dest = false;
	}
	
	// 返回结果。
	return dest;
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
			
			return function (path, dest, data) {
				for (var i = 0; i < newFilter.length; i++) {
					var result = newFilter[i](path, dest, data);
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
		return function (path, dest, data) {
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
		return function (path, dest, data) {
			var match = filter(path, dest, data);
			if (match) {
				return match !== true ? match : dest ? dest : true;
			}
			return false;
		};
	}
	
	// createPathFilter()
	return function (path, dest, data) {
		return false;
	};

}

exports.createPathFilter = createPathFilter;

// #endregion
