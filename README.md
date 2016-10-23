digo
==============================
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url] [![Gitter chat][gitter-image]][gitter-url]

digo 是一个轻量、实用的流程化自动构建工具。

通过插件，digo 可以为项目提供代码预编译、模块依赖打包、压缩优化等自动构建功能。

特性
-------------------------------
1. **轻量**：您只需简单定义构建的流程，立即就能享受自动化发布的快感。
2. **高性能**：得益于 [Node.js](https://nodejs.org/) 的异步 IO 特性，digo 可以高效地构建项目。
3. **易上手**: 只需三分钟看完[入门指南](https://github.com/digojs/digo/wiki/入门指南)，马上就能实现预期的效果。
4. **易扩展**: 使用[插件](https://github.com/digojs/digo-plugins#digo-插件列表)，轻松满足不同的发布需求。

下载安装
-------------------------------
```
$ npm install digo -g
```
> 如果安装不成功，请[点击这里](https://github.com/digojs/digo/wiki/常见问题#安装失败)。

文档
-------------------------------
- [入门指南](https://github.com/digojs/digo/wiki/入门指南)
- [教程：如何使用 digo 构建前端项目](https://github.com/digojs/digo/wiki/教程：如何使用%20digo%20构建前端项目)
- [插件列表](https://github.com/digojs/digo-plugins#digo-插件列表)
- [项目配置模板](https://github.com/digojs/digo-digofiles#digo-digofiles)
- [digo vs gulp & webpack](https://github.com/digojs/digo/wiki/工具比较)
- [更多文档](https://github.com/digojs/digo/wiki)

`digofile.js` 示例
-------------------------------
```js
var digo = require("digo");

exports.build = function() {
    var list = digo.src("src");
    list.src("*.js").pipe("digo-babel");
    list.src("*.less").pipe("digo-less").pipe("digo-autoprefixer");
    list.dest("_build");
    return list;
};

exports.publish = function() {
    var list = exports.build();
    digo.then(function (){
        list.src("*.js").pipe("digo-uglify-js");
        list.src("*.css").pipe("digo-clean-css");
        list.dest("_release");
    });
};

exports.default = exports.watch = function() {
    digo.watch(exports.build);
};

```

贡献代码
-------------------------------
社区支持始终是国内开源项目的硬伤。

我们忠心地希望得到您的支持，如果您觉得这个项目不错，请点击右上角的关注。
或者您还可以:
- [报告 BUG](https://github.com/digo/digo/issues/new)
- [提交需求](https://github.com/digo/digo/issues/new)
- [共享一个插件](https://github.com/digojs/digo/wiki/编写插件#共享你的插件)
- [贡献代码](https://github.com/digojs/digo/wiki/贡献代码)

[npm-url]: https://www.npmjs.com/package/digo
[npm-image]: https://img.shields.io/npm/v/digo.svg
[downloads-image]: https://img.shields.io/npm/dm/digo.svg
[downloads-url]: http://badge.fury.io/js/digo
[travis-url]: https://travis-ci.org/digojs/digo
[travis-image]: https://img.shields.io/travis/digojs/digo.svg
[coveralls-url]: https://coveralls.io/github/digojs/digo
[coveralls-image]: https://img.shields.io/coveralls/digojs/digo/master.svg
[gitter-url]: https://gitter.im/digojs/digo
[gitter-image]: https://img.shields.io/badge/gitter-digo%2Fdigo-brightgreen.svg
