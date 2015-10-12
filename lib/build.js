var Path = require('path');
var IO = require('tealweb/io');
var Builder = require('./builder.js');

/**
 * 生成项目。
 * @param {Object} ... 生成的配置列表。
 * * @property {String} [src] 生成的源文件夹。默认为当前环境所在文件夹。
 * * @property {String} [dest] 生成的目标文件夹。默认为 @src。
 * * @property {Boolean} [clean] 是否在生成前清理文件夹。默认为自动清理。
 * * @property {Array|String} [ignores] 设置生成时忽略的文件或文件夹。支持扩展通配符。
 * * @property {Array|String} [filter] 设置生成时需要处理的文件或文件夹。支持扩展通配符。
 * * @property {Array} [rules] 设置生成的规则。规则为一个数组，数组的每一项为对象，包含以下属性：
 * * * @property {String} src 当前规则对应的源文件。支持扩展通配符。
 * * * @property {String} dest 当前规则对应的目标文件。其中 $N 会被替换为 @src 对应匹配结果。
 * * * @property {Array|String} [ignores] 指定当前规则的匹配例外。支持扩展通配符。
 * * * @property {Function} [when] 指定当前规则的生效场景。其参数为：
 * * * * @param {Builder} context 当前生成操作的上下文。
 * * * * @returns {Boolean} 如果返回 @false 说明规则无效，否则规则有效。
 * * * @property {Array|Function} process 指定当前规则的额外处理程序，可以是单个函数或函数数组。函数的参数为：
 * * * * @param {BuildFile} file 当前生成的文件信息。
 * * * * @param {Builder} context 当前生成操作的上下文。
 * * * * @returns {Array|String} 返回生成的文件内容。如果有多个文件则返回数组。
 * * * @property {Boolean} [break=false] 如果值为 @true，则处理完当前规则后停止处理其它规则。
 * * @property {Function} [prebuild] 发布前的预处理。
 * * @property {Function} [postbuild] 发布后的处理。
 * * @property {Number} [logLevel=2] 设置日志等级，可能值有 2：全部显示，1 ：只显示错误，0：全部不显示。
 * * @property {Boolean} [verbose] 指示是否为调试模式。
 * @param {Boolean} complete=true 指示当前构建操作是否具备完全的操作。
 * @returns {Builder} 返回当前的生成上下文。
 */
module.exports = function (options, complete) {

    // 开始编译。
    var builder = new Builder(options);
    complete = complete !== false;
    builder.building = true;
    if (builder.clean == null) {
        builder.clean = complete && builder.src !== builder.dest;
    }
    builder.messages = module.exports.Messages;

    complete && builder.info("Start Building...");
    builder.info("{src} -> {dest}", builder);

    // 清理文件夹。
    if (builder.clean) {
        builder.debug("> Cleaning...", builder);
        IO.cleanDir(builder.dest);
    }

    // 执行预处理器。
    if (builder.prebuild) {
        builder.debug("> Executing prebuild...");
        builder.prebuild();
    }

    // 生成文件。
    builder.debug("> Processing Files...");
    IO.walkDir(builder.src, function (path, isDir) {

        // 路径是否被忽略。
        if (builder.ignored(path)) {
            return false;
        }

        // 将文件加入到待编译列表。
        if (!isDir) {
            var fullPath = Path.resolve(builder.src + path);
            builder.process(fullPath, path);
        }

    }, "/");

    // 执行一次性任务。
    builder.debug("> Running run-once rules");
    builder.processRunOnceRules();

    // 执行结束处理器。
    if (builder.postbuild) {
        builder.debug("> Executing postbuild...");
        builder.postbuild();
    }

    // 保存文件。
    builder.debug("> Saving Files...");
    var fileCount = 0;
    for (var path in builder.files) {
        fileCount++;
        builder.files[path].save();
    }

    // 串联多个生成器。
    if (arguments.length > 1) {
        var args = [].slice.call(arguments, 1);
        args[0] = args[0] || {};
        args[0].prebuilder = builder;
        args[0].errors = builder.errors;
        return module.exports.apply(this, args);
    }

    // 完成编译。
    var errorCount = builder.errors.length;
    builder.log(errorCount ? "\n\033[49;31;1mBuild Completed! ({1} files processed, {0} error(s) found)\033[0m\n\n" : "\n\033[49;32;1mBuild Success! ({1} files processed)\033[0m\n\n", errorCount, fileCount);

    return builder;
};

module.exports.Messages = {
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
