var Path = require('path');
var ProjectBuilder = require('./builder.js');

function watch(path, ignored, callback) {
    var watcher = require('chokidar').watch(path).on('change', callback);
    watcher._isIgnored = ignored;
    return watcher;
}

/**
 * 监听当前项目的改动。
 * @param {mixed} ... 需要监听的路径过滤器。 
 */
module.exports = function (options) {

    // 开始编译。
    var builder = new ProjectBuilder(options);
    builder.watching = true;

    builder.watcher = watch(builder.src, function (path) {
        return builder.ignored(path);
    }, function (path) {
        builder.process(path, undefined, undefined, true).save();
    }, "/");

    builder.log("\033[36mWatching {src}...\033[0m", builder);
    return builder;
};
