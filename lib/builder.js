/**
 * @fileOverview 提供构建工具的基础功能。
 */

var Path = require('path');
var FS = require('fs');
var IO = require('tealweb/io');
var Lang = require('tealweb/lang');

// #region Builder

// #region 核心

/**
 * 表示一个项目构建工具。
 * @param {Object} options 规则的配置。
 * @class
 */
function Builder(options) {
    this.config(options);
}

/**
 * 更新当前构建器的配置。
 * @returns {Boolean} 
 */
Builder.prototype.config = function (options) {
    Object.assign(this, options);

    this.src = Path.resolve(this.src || '');
    this.dest = Path.resolve(this.src, this.dest || '');

    this.rules = this.rules.map(function (rule) {
        return new BuildRule(rule);
    });

    if (this.ignores) {
        this.ignored = createPathFilter(this.ignores);
    }

    if (this.logLevel < 2) {
        this.log = function () { };
    }
    if (this.logLevel < 1) {
        this.error = function (error) { this.errors.push(error); };
    }

    this.files = this.files || Object.create(null);
    this.errors = this.errors || [];
};

/**
 * 获取或设置当前项目的日志等级。
 */
Builder.prototype.logLevel = 4;

/**
 * 获取或设置当前项目的编码。
 */
Builder.prototype.encoding = "utf-8";

/**
 * 获取或设置当前项目的所有规则。
 */
Builder.prototype.rules = [];

/**
 * 判断指定路径是否被忽略。
 * @param {String} path 要判断的文件或文件夹路径。
 * @returns {Boolean} 
 */
Builder.prototype.ignored = function (path) {
    return false;
};

/**
 * 获取指定路径的短名。
 * @param {String} path 要处理的路径。
 * @returns {String} 返回不含绝对路径的部分。
 */
Builder.prototype.getName = function (path) {
    return Path.relative(this.src, path).replace(/\\/g, "/").replace(/^(?:[^.])/, "/$&");
};

/**
 * 获取指定短名的完整路径。
 * @param {String} name 要处理的短名。
 * @returns {String} 返回绝对路径的部分。
 */
Builder.prototype.getPath = function (name) {
    return Path.resolve(this.src + "/./" + name);
};

/**
 * 获取指定规则匹配到的所有文件。
 * @param {String} path 要处理的路径。
 * @returns {String} 返回不含绝对路径的部分。
 */
Builder.prototype.getFilesByRule = function (rule) {
    var builder = this;
    var files = [];
    if (rule.specified) {
        if (Array.isArray(rule.src)) {
            rule.src.forEach(function (src) {
                files.push(builder.getPath(src));
            });
        } else if (rule.src) {
            files.push(builder.getPath(rule.src));
        }
    } else {
        IO.walkDir(builder.src, function (path, isDir) {

            // 路径是否被忽略。
            if (builder.ignored(path)) {
                return false;
            }

            // 将文件加入到待编译列表。
            if (!isDir) {
                var fullPath = Path.resolve(builder.src + path);
                if (rule.match(path)) {
                    files.push(fullPath);
                }
            }

        }, "/");
    }

    return files;
};

// #endregion

// #region 日志功能

/**
 * 打印一条生成日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.log = function (message) {
    message = String.format.apply(String, arguments);
    return console.log(message);
};

/**
 * 打印一条错误日志。
 * @param {String} message 要输出的信息。 
 * @param {Object} ... 格式化参数。 
 */
Builder.prototype.error = function (message) {
    message = String.format.apply(String, arguments);
    this.errors.push(message);
    return console.error("\033[49;31;1m" + message + "\033[0m");
};

/**
 * 调试输出信息。
 * @param {Object} ... 要输出的信息。 
 */
Builder.prototype.debug = function () {
    if (this.verbose) {
        console.log.apply(console, arguments);
    }
};

// #endregion

// #region 文件处理

/**
 * 处理指定的文件。
 * @param {String} path 要处理文件的绝对路径。
 * @param {String} [name] 手动指定文件的别名。临时生成的文件名字应以 # 开头。
 * @param {String} [content] 手动指定文件的内容。
 * @param {Boolean} [tmpFile=false] 指示是否将当前文件是否是临时文件。
 * @return {BuildFile} 返回文件信息。
 */
Builder.prototype.process = function (path, name, content, tmpFile) {

    // 测试指定的文件是否在缓存中。
    var file = this.files[path];
    if (!file) {
        file = new BuildFile(this, path, name, content);

        // 指示是否是临时文件。
        if (!tmpFile) {
            this.files[file.src] = file;
        }

        // 依次应用每个规则。
        for (var i = 0; i < this.rules.length; i++) {
            var rule = this.rules[i];

            // 判断指定规则是否可用于当前文件路径。同时获取当前规则的发布结果。
            var dests = rule.match(file.name);
            if (dests) {

                // 根据当前规则更新文件的最终路径。
                if (dests === true) {
                    file.dest = Path.resolve(this.dest + "/./" + file.name);
                } else {
                    dests = dests.map(function (dest) {
                        return Path.resolve(this.dest + "/./" + dest);
                    }, this);

                    file.dest = dests[0];

                    if (dests.length > 1) {
                        file.relatedFiles = file.relatedFiles || [];
                        for (var j = dests.length - 1; j > 0; j--) {
                            var relatedFile = new BuildFile(this, file.src, file.name, undefined, dests[j]);
                            file.relatedFiles.push(relatedFile);
                        }
                    }
                }

                this.processFileWithRule(file, rule);

                // 应用规则中断条件。
                if (rule['break']) {
                    break;
                }
            }

        }

    }
    return file;
};

/**
 * 基于指定规则处理指定的文件。
 * @param {BuildFile} file 当前的路径。
 * @param {BuildRule} rule 当前的规则。
 */
Builder.prototype.processFileWithRule = function (file, rule) {

    if (this.logLevel > 2) {
        this.log("\033[32m+ {1}\033[0m", file.src, file.dest);
    }

    file.rule = rule;

    // 根据当前规则更新文件的最终内容。
    for (var j = 0; j < rule.process.length; j++) {
        if (this.verbose) {
            file.content = rule.process[j].call(rule, file, this);
        } else {
            try {
                file.content = rule.process[j].call(rule, file, this);
            } catch (e) {
                this.error("{0}: {1}", file.src, e.message);
                break;
            }
        }
    }

};

/**
 * 预执行只需要执行一次的规则。
 */
Builder.prototype.processRunOnceRules = function () {
    for (var i = 0; i < this.rules.length; i++) {
        var rule = this.rules[i];
        if (rule.runOnce) {
            this.rules.splice(i--, 1);
            var src = this.getFilesByRule(rule);
            var file;
            if (src[0]) {
                file = new BuildFile(this, src[0], undefined, undefined, Path.resolve(this.dest + "/./" + (rule.dest || this.getName(src[0]))));
            } else {
                src[0] = "#Rule" + i;
                file = new BuildFile(this, src[0], src[0], undefined, rule.dest && Path.resolve(this.dest + "/./" + rule.dest));
            }
            src.forEach(function (path) {
                this.files[path] = file;
            }, this);
            this.processFileWithRule(file, rule);
        }
    }
};

// #endregion

module.exports = Builder;

// #endregion

// #region BuildFile

/**
 * 表示一个生成文件。一个生成文件可以是一个物理文件或虚拟文件。
 * @class
 */
function BuildFile(builder, src, name, content, dest) {
    this._builder = builder;
    this.src = src;
    this.name = name || builder.getName(src);
    this._content = content;
    this.dest = dest || src;
}

/**
 * 获取当前正在处理的文件内容。
 */
BuildFile.prototype.__defineGetter__('content', function () {
    if (this._content == undefined) {
        this._content = this._buffer ? this._buffer.toString(this._builder.encoding) : this.load(this._builder.encoding);
    }
    return this._content;
});

/**
 * 设置当前正在处理的文件内容。
 */
BuildFile.prototype.__defineSetter__('content', function (value) {
    if (Array.isArray(value)) {
        this._content = value[0];
        this._buffer = null;
        this._contentUpdated = true;
        if (this.relatedFiles) {
            for (var i = 0; i < this.relatedFiles.length; i++) {
                this.relatedFiles[i].content = value[i];
            }
        }
    } else if (value != undefined) {
        this._content = value;
        this._buffer = null;
        this._contentUpdated = true;
    }
});

/**
 * 获取当前正在处理的文件内容（二进制格式）。
 */
BuildFile.prototype.__defineGetter__('buffer', function () {
    if (this._buffer == undefined) {
        this._buffer = this._content != undefined ? new Buffer(this._content) : this.load();
    }
    return this._buffer;
});

/**
 * 获取当前正在处理的文件内容（二进制格式）。
 */
BuildFile.prototype.__defineSetter__('buffer', function (value) {
    this._buffer = value;
    this._content = null;
    this._contentUpdated = true;
});

/**
 * 获取当前正在处理的文件的所有源文件。
 */
BuildFile.prototype.__defineGetter__('allSrc', function () {
    return this._builder.getFilesByRule(this.rule);
});

/**
 * 获取当前正在处理的文件的所有生成文件。
 */
BuildFile.prototype.__defineGetter__('allDest', function () {
    return this.relatedFiles ? [this].concat(this.relatedFiles) : [this];
});

/**
 * 获取当前路径相对于指定基路径的相对路径。
 */
BuildFile.prototype.relative = function (path) {
    return Path.relative(Path.dirname(path), this.dest).replace(/\\/g, '/');
};

/**
 * 保存当前文件内容。
 */
BuildFile.prototype.write = function () {
    if (this._contentUpdated) {
        if (this._buffer != undefined) {
            FS.writeFileSync(this.dest, this._buffer);
        } else {
            IO.writeFile(this.dest, this._content, this._builder.encoding);
        }
    } else if (this.dest !== this.src) {
        IO.copyFile(this.src, this.dest);
    }
};

/**
 * 载入当前文件。
 */
BuildFile.prototype.load = function (encoding) {
    return encoding ?
        IO.existsFile(this.src) ? IO.readFile(this.src, encoding) : '' :
        IO.existsFile(this.src) ? FS.readFileSync(this.src) : new Buffer();
};

/**
 * 保存当前文件。
 */
BuildFile.prototype.save = function () {

    if (this._saved) {
        return;
    }
    this._saved = true;

    // 保存当前文件。
    if (this.dest) {
        try {
            this.write();
        } catch (e) {
            this._builder.error("{0}: {1}", this.dest, e);
        }
    }

    // 保存目标文件。
    if (this.relatedFiles) {
        for (var i = 0; i < this.relatedFiles.length; i++) {
            this.relatedFiles[i].save();
        }
    }
};

BuildFile.prototype.valueOf = function () {
    return this.src;
};

BuildFile.prototype.toString = function () {
    return this.content;
};

exports.BuildFile = BuildFile;

// #endregion

// #region BuildRule

/**
 * 表示一个生成规则。
 * @param {Object} options 规则的配置。
 * @class
 */
function BuildRule(options) {
    Object.assign(this, options);
    if (!Array.isArray(this.process)) {
        this.process = this.process ? [this.process] : [];
    }
    this.specified = isConst(this.src);
    this.runOnce = this.runOnce || this.specified;
    this.srcFilter = createPathFilter(this.src);
    if (this.ignores) {
        this.ignoreFilter = createPathFilter(this.ignores);
    }
    if (this.dest) {
        this.dests = Array.isArray(this.dest) ? this.dest : [this.dest];
    }
}

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

function isConst(path) {
    if (Array.isArray(path)) {
        return path.every(isConst);
    }

    return !/[\*\?]/.test(path);
}

/**
 * 返回一个用于过滤指定路径的过滤器。
 * @param {mixed} filter 过滤器。可以是通配字符串、正则表达式、函数、空(表示符合任何条件)或以上过滤器组合的数组。
 * @returns {Function} 返回一个过滤器函数。此函数的参数为：
 * * @param {String} path 要测试的路径。
 * * @param {Array} dest 重定向的目标路径（其中 $n 会被替换为源路径的匹配部分)。
 * * @return {String} 如果返回 @null 则表示不符合当前过滤器，否则返回最终生效的目标路径。
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
        filter = RegExp.parseWildCard(filter);
        return function (path, dest) {
            var match = filter.exec(path);
            if (match) {
                return dest ? dest.map(function (dest) {
                    return dest.replace(/\$(\d+)/g, function (all, n) {
                        if (n > 0) n++;
                        return n in match ? match[n] : all;
                    });
                }) : true;
            }
            return false;
        };
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
