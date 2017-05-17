# digo
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Coveralls Status][coveralls-image]][coveralls-url]
[![Gitter chat][gitter-image]][gitter-url]

digo 是一个描述式的轻量自动化构建工具。

您只需简单描述构建的流程，就能立享自动化发布的快感。

通过插件，digo 可以为项目提供预编译、依赖打包、压缩优化等构建功能。

## 下载安装
```bash
npm install digo -g
```
> 如果不会安装或安装失败，请[点击这里](https://github.com/digojs/digo/wiki/常见问题#安装失败)。 

## 快速上手
### 1. 在项目根目录下新建名为 digofile.js 的文件：
```js
var digo = require("digo");

exports.hello = function () {
    digo.src("*.js")
        .pipe(function (file) { 
            file.content = file.content.replace(/\/\/.*$|\/\*.*?\*\//mg, "");
        })
        .dest("_build");
};
```

### 2. digo 一下:
```bash
digo hello
```
执行后项目内所有 .js 文件都会被拷贝到 _build 目录，且注释都被删除了。

> 如果执行报错请[点击这里](https://github.com/digojs/digo/wiki/常见问题#执行失败)。

## 了解更多
digo 核心提供了读写文件、监听等底层接口，通过插件可以为项目扩展更多有用的功能。

- [如何：使用 digo 构建 Web 前端项目](https://github.com/digojs/digo/wiki/如何：使用-digo-构建-Web-前端项目)
- [digo vs gulp/webpack](https://github.com/digojs/digo/wiki/digo-vs-gulp-webpack)
- [digo 教程和参考手册](https://github.com/digojs/digo/wiki)
- [插件列表](https://github.com/digojs/plugins#readme)
- [digofile 模板(脚手架)](https://github.com/digojs/digofiles#readme)
- [API 文档](http://digojs.github.io/api)：[digo.src](https://digojs.github.io/api/globals.html#src)、[digo.watch](https://digojs.github.io/api/globals.html#watch)、[digo.exec](https://digojs.github.io/api/globals.html#exec)、[更多...](http://digojs.github.io/api)
- [编写插件](https://github.com/digojs/digo/wiki/编写插件)
- [更新历史](https://github.com/digojs/digo/wiki/更新历史)

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
