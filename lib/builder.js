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
	this.rules.push(rule);
	return rule;
};

/**
 * 清空构建器缓存。
 */
Builder.prototype.reset = function () {
	delete this.files;
	this._ignoreFilter = null;
	this.rules.length = 0;
	this.ignores.length = 0;
	this.errors.length = 0;
	this._currentRuleIndex = 0;
};

// #endregion

// #region 生成

/**
 * 根据当前设置的规则生成项目。
 * @param {String} [dest] 生成文件的保存文件夹。默认为当前文件夹。
 * @param {String} [clean] 指示是否在生成前清理文件夹。默认为自动清理。
 * @returns {Number} 返回本次生成所保存的文件数。 
 */
Builder.prototype.build = function (dest, clean) {
	
	// 1. 准备工作：设置相关路径。
	this.info("Start Building...", this);
	this.srcFullPath = Path.resolve(this.getFullPath('.'));
	this.destFullPath = Path.resolve(this.srcFullPath, dest || '');
	this.info("{srcFullPath} -> {destFullPath}", this);
	
	// 2. 清理文件夹。
	if (clean == null ? this.srcFullPath.indexOf(this.destFullPath) < 0 : clean) {
		this.debug("> Cleaning...", this);
		try {
			IO.cleanDir(this.destFullPath);
		} catch (e) {
			this.error('Clean {0} Error: {1}', this.destFullPath, e);
		}
	}
	
	// 3. 收集所有文件：记录所有文件的处理结果。
	this.debug("> Collecting Files...", this);
	this.files = Object.create(null);
	IO.walkDir(this.srcFullPath, function (path, isDir) {
		// 路径是否被忽略。
		if (this.ignored(path)) {
			return false;
		}
		// 将文件加入到待编译列表。
		if (!isDir) {
			this.files[path] = new BuildFile(this, path);
		}
	}.bind(this));
	
	// 4. 依次执行所有规则。
	for (var i = 0; i < this.rules.length; i++) {
		var rule = this.rules[i];
		
		// 设置当前已执行的规则索引。
		this._currentRuleIndex = i;
		
		// 使用当前规则处理所有文件。
		// 文件默认按扫描顺序依次处理。如果文件有依赖项，可能依赖项会提取被处理。
		for (var path in this.files) {
			var file = this.files[path];
			
			// 当前文件已被作为其他文件的依赖项提取处理了，不需要重复处理。
			if (file.ruleIndex >= i) {
				continue;
			}
			
			// 设置当前文件的已处理了。
			file.ruleIndex = i;
			
			// 使用当前规则处理指定文件。
			this.processFileWithRule(file, rule);
				
		}
		
		// 特殊任务：对于无输入源的任务，则不需要对匹配的源处理，强制执行一次。
		if (!rule.srcPath.length) {
			this.processFileWithRuleCore(new BuildFile(this, rule.destPath, ""), rule, rule.destPath);
		}
		
	}
	
	// 5. 保存生成文件。
	this.debug("> Saving Files...", this);
	var fileCount = 0;
	for (var path in this.files) {
		try {
			if (this.files[path].save(this.destFullPath)) {
				fileCount++;
			}
		} catch (e) {
			this.error('Saving {0} Error: {1}', this.files[path].path, e);
		}
	}
	
	// 6.输出结果。
	this.info("{srcFullPath} -> {destFullPath}", this);
	var errorCount = this.errors.length;
	if (errorCount) {
		this.error("Build Completed! ({0} files updated, {1} error(s) found)", fileCount, errorCount);
	} else {
		this.success("Build Success! ({0} files updated)", fileCount, errorCount);
	}
	
	return fileCount;
};

/**
 * 获取指定文件的当前生成结果。
 * @returns {BuildFile} 返回指定文件。 
 */
Builder.prototype.getFile = function (path, content) {
	var file = this.files[path] || new BuildFile(this, path, content);
	
	// 确保依赖文件已执行当前任务。
	while (file.ruleIndex < this._currentRuleIndex) {
		this.processFileWithRule(file, this.rules[++file.ruleIndex]);
	}
	
	return file;
};

/**
 * 使用当前规则集处理指定的文件。
 * @param {String} path 要处理文件的路径。
 * @param {String} [content] 手动指定文件的内容。
 * @return {BuildFile} 返回文件信息。
 */
Builder.prototype.process = function (path, content) {
	var file = new BuildFile(this, path, content);
	
	// 依次执行所有规则。
	for (var i = 0; i < this.rules.length; i++) {
		var rule = this.rules[i];
		
		// 设置当前已执行的规则索引。
		file.ruleIndex = i;
		
		// 使用当前规则处理指定文件。
		this.processFileWithRule(file, rule, true);

	}
	
	return file;
};

/**
 * 基于指定规则处理指定的文件。
 * @param {BuildFile} file 要处理的文件。
 * @param {BuildRule} rule 要使用的规则。
 * @param {Boolean} isTmpFile 指示是否是临时文件。
 */
Builder.prototype.processFileWithRule = function (file, rule, isTmpFile) {
	// 判断规则是否可用于处理当前文件。
	var dest = rule.match(file.path);
	if (dest !== null) {
		this.processFileWithRuleCore(file, rule, dest, isTmpFile);
	}
};

/**
 * 底层基于指定规则处理指定的文件。
 * @param {BuildFile} file 要处理的文件。
 * @param {BuildRule} rule 要使用的规则。
 * @param {String} dest 生成的目标文件。
 * @param {Boolean} isTmpFile 指示是否是临时文件。
 */
Builder.prototype.processFileWithRuleCore = function (file, rule, dest, isTmpFile) {
	
	// 更新文件的路径。
	file.prevPath = file.path;
	file.path = file.destPath = dest;
	
	// 根据当前规则更新文件的最终内容。
	for (var i = 0; i < rule.processors.length; i++) {
		if (this.logLevel >= Builder.LOG_LEVEL.debug) {
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
	
	if (file.path) {
		
		// 保存结果。
		if (!isTmpFile) {
			this.files[file.path] = file;
		}
	
		if (file.prevPath === file.path) {
			this.log("> {0}", file.prevPath);
		} else {
			this.log('> {0} -> {1}', file.prevPath, file.path);
		}
	}
	
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
	return Path.resolve(this.basePath, path);
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
	this.log("+ {0}", path);
	this.files[path] = new BuildFile(this, path, content);
	return this.getFile(path, content);
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

// #region 监听

function watch(path, ignored, callback) {
	var watcher = require('chokidar').watch(path).on('change', callback);
	watcher._isIgnored = ignored;
	return watcher;
}

/**
 * 监听当前项目的改动。
 * @param {Function} callback 返回需要监听的任务列表。 
 */
Builder.prototype.watch = function (callback) {
	var builder = this;
	this.watcher = watch(this.getFullPath('.'), function (path) {
		if (builder.ignored(path)) {
			return false;
		}
		
		// 判断是否符合任一规则。
		for (var i = 0; i < builder.rules.length; i++) {
			if (builder.rules[i].match(path)) {
				return true;
			}
		}
		
		return false;
	}, function (path) {
		builder.process(path).save();
		callback && callback(path);
	});
	this.info("Watching {0}...", this.getFullPath('.'));
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

BuildFile.prototype.ruleIndex = -1;

/**
 * 获取或设置当前文件的最终路径。
 * @name path
 */

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
 * 获取当前文件的原始完整路径。
 * @type {String}
 */
BuildFile.prototype.__defineGetter__('srcFullPath', function () {
	return this.builder.getFullPath(this.srcPath);
});

/**
 * 获取当前文件的目标完整路径。
 * @type {String}
 */
BuildFile.prototype.__defineGetter__('destFullPath', function () {
	return this.builder.getFullPath(this.destPath);
});

/**
 * 保存当前文件内容。
 * @param {String} [destBasePath] 保存的目标基础路径。
 * @return {Boolean} 如果成功保存则返回 @true，否则返回 @false。
 */
BuildFile.prototype.save = function (destBasePath) {
	
	// 如果目标路径为 null，表示不生成文件。
	// 不重复生成。
	if (!this.path || this._saved) {
		return false;
	}
	
	this._saved = true;
	
	// 获取目标保存路径。
	var destFullPath = destBasePath ? Path.resolve(destBasePath, this.path) : this.builder.getFullPath(this.path);
	
	// 内容发生改变则存储文件。
	if (this._contentUpdated) {
		IO.ensureDir(destFullPath);
		if (this._buffer != undefined) {
			FS.writeFileSync(destFullPath, this._buffer);
		} else {
			FS.writeFileSync(destFullPath, this._content, this.builder.encoding);
		}
		return true;
	}
	
	// 仅路径改变则简单复制文件。
	var srcFullPath = this.builder.getFullPath(this.srcPath);
	if (srcFullPath !== destFullPath) {
		IO.copyFile(srcFullPath, destFullPath);
		return true;
	}
	
	return false;
};

/**
 * 载入当前文件。
 * @param {String} [encoding] 解析文本内容的编码。
 * @return {String|Buffer} 如果指定了编码则返回文件文本内容，否则返回文件数据。
 */
BuildFile.prototype.load = function (encoding) {
	var srcFullPath = this.builder.getFullPath(this.srcPath);
	return encoding ? IO.readFile(srcFullPath, encoding) : IO.existsFile(srcFullPath) ? FS.readFileSync(srcFullPath) : new Buffer(0);
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
 * @return {Array|Boolean} 返回匹配之后的目标路径。如果无目标路径则返回 @true，如果不匹配则返回 @false。
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
 * * @return {String 如果返回 @null 则表示不符合当前过滤器，否则返回最终生效的目标路径。如果未指定 @dest 则返回 @path。
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
			return match ? dest !== undefined ? dest.replace(/\$(\d+)/g, function (all, n) {
				return n in match ? match[n] : all;
			}) : path : null;
		};
	}
	
	// createPathFilter(function(){ ... })
	if (filter instanceof Function) {
		return function (path, dest) {
			var match = filter.apply(this, arguments);
			return match === true ? dest === undefined ? path : dest : match === false ? null : match;
		};
	}
	
	// createPathFilter()
	return function () {
		return null;
	};

}

exports.createPathFilter = createPathFilter;

// #endregion
