
var ProjectBuilder = require('./builder.js');

module.exports = function (options) {
    var builder = new ProjectBuilder(options);
    builder.port = builder.port || 8080;
    var HttpServer = require('aspserver').HttpServer;
    var server = new HttpServer({
        url: builder.url,
        port: builder.port,
        physicalPath: builder.src,
        handlers: builder.handlers,
        modules: builder.modules,
        mimeTypes: builder.mimeTypes,
        defaultPages: builder.defaultPages,
        urlRewrites: builder.urlRewrites
    });

    server.on('start', function () {
        builder.log("Server Running At {rootUrl}", this);
    });

    server.on('stop', function () {
        builder.log("Server Stopped At {rootUrl}", this);
    });

    server.on('error', function (e) {
        if (e.code == 'EADDRINUSE') {
            builder.error(this.address && this.address !== '0.0.0.0' ? 'Create Server Error: Port {port} of {address} is used by other programs.' : 'Create Server Error: Port {port} is used by other programs.', this);
        } else {
            builder.error(e.toString());
        }
    });

    server.start();
    
    return server;
};

////var Parser = {

////    less: function (content, path) {

////    },

////    sass: function (content, path) {

////    }

////};

////var s = {

////    handlers: {

////        ".css": function (context) {
////            context.response.contentType = context.applicationInstance.mimeTypes[".css"];

////            var path = context.request.physicalPath;

////            function tryParser(extName, parser) {
////                var newPath = path.replace(/\.css$/, extName);
////                if (IO.existsFile(newPath)) {
////                    var content = parser(IO.readFile(newPath, context.application.fileEncoding), newPath);
////                    context.response.end(content);
////                    return true;
////                }
////                return false;
////            }

////            return tryParser('.less', Parser.less) ||
////                 tryParser('.sass', Parser.sass) ||
////                 tryParser('.stylus', Parser.stylus) ||
////                 require('aspserver/handlers/staticfilehandler').processRequest(context)

////            // 尝试使用 less 。
////            var newPath = path.replace(/\.css$/, '.less');
////            if (IO.existsFile(newPath)) {
////                var content = Parser.less(IO.readFile(newPath, context.application.fileEncoding), newPath);
////                context.response.end(content);
////                return;
////            }

////            // 尝试使用 sass 。
////            newPath = path.replace(/\.css$/, '.sass');
////            if (IO.existsFile(newPath)) {
////                var content = Parser.sass(IO.readFile(newPath, context.application.fileEncoding), newPath);
////                context.response.end(content);
////                return;
////            }


////        }

////    },

////    markdown: {

////        ".md": function() {

////        }

////    }


////};

// /**
//  * 启用针对当前配置的服务器。
//  * @param {String} serverUrl 服务器地址或端口。
//  */
// BuildRuleSet.prototype.startServer = function (serverUrl) {

//     // 支持直接传递端口。
//     if (/^\d+$/.test(serverUrl)) {
//         serverUrl = "http://localhost:" + serverUrl;
//     }

//     // 从配置解析出各个请求入口。

//     var me = this;
//     var cache = {};
//     function buildCache() {
//         me.walk(function (path, isDir) {
//             var dest;
//             for (var i = 0; i < me.configs.length; i++) {
//                 dest = me.configs[i].destOf(path);
//                 if (dest !== null) {
//                     cache[dest] = {
//                         srcPath: path,
//                         config: me.configs[i]
//                     };
//                     break;
//                 }
//             }
//             return dest;
//         });
//     }

//     // 在各个配置中找到针对指定路径生成的配置。
//     // 如请求 /abc/file.js
//     // 则 "/def/*" -> "abc/$0" 的配置生效
//     function findConfig(project, path, fullPath) {

//         if (path in cache) {
//             if (IO.exists()) {

//             }
//         }

//         // path: abc/def.js


//     }

//     var server = require('aspserver');


//     return true;
// };
