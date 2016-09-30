Digo
==============================

[![Join the chat at https://gitter.im/digojs/digo](https://badges.gitter.im/digojs/digo.svg)](https://gitter.im/digojs/digo?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url] [![Gitter chat][gitter-image]][gitter-url]

Digo 是一个轻量、实用的基于规则的自动化构建工具。

Digo 可为项目带来代码预编译、模块化打包、压缩优化等自动化发布构建功能。

特性
-------------------------------
1. **简单**：您只需简单定义源代码构建的规则，立即就能享受自动化发布的快感。
2. **高性能**：得益于 [Node.js](https://nodejs.org/) 的异步 IO 特性，Digo 可以高效地构建项目。
3. **易上手**: 只需掌握 4 个 [API](https://github.com/digojs/digo/wiki/API)，马上即可实现预期的功能。
4. **易扩展**: 通过[插件](https://github.com/digojs/digo/wiki/插件)，可以轻松满足不同的发布需求。

下载安装
-------------------------------
```
$ npm install digo -g
```
> 如果安装不成功，请[点击这里](https://github.com/digojs/digo/wiki/常见问题#安装失败)。

首次使用
-------------------------------
### 1. 在项目根目录新建 `digo.config.js`：
```js
var digo = require("digo");

digo.src("*.txt")
    .pipe(function(file) {  
        file.content += "哈哈";
    })
    .dest("build");
```
> 提示：可以使用 `digo --init` 命令自动生成一个 `digo.config.js`。

### 2. 发布项目
执行 `digo` 命令发布项目:
```
$ digo
Build Success!(error: 0, warning: 0, file: 1, time: 10ms, 10:00:00)
```
执行后可以发现，文件夹里的所有 .txt 文件都被复制到了 build 目录，并且末尾都追加了“哈哈”两个字。
> 如果您未能执行成功，请[点击这里](https://github.com/digojs/digo/wiki/常见问题#执行失败)。

### 3. 监听(实时编译)
执行 `digo -w` 即可监听所有 *.txt 文件并在文件保存后重新生成。
```
$ digo -w
Start Watching...(error: 0, warning: 0, file: 1, time: 10ms, 10:00:00)
```

### 4. 任务
一个项目可能有多种发布需求（比如区分开发环境和正式环境），这时可以定义多个任务。
在 `digo.config.js` 中添加:
```js
exports.hello = function() {
    console.log("Hello, digo");
};
```
然后执行 `digo hello` 命令来调用任务:
```
$ digo hello
Hello, digo
Done!(error: 0, warning: 0, file: 1, time: 1ms, 10:00:00)
```
> 提示：当直接执行 `digo` 命令时，相当于调用了名为 `default` 的任务。

常见需求
-------------------------------
- [编译 less/sass/coffee/jsx/ts/md/...](https://github.com/digojs/digo/wiki/编译)
- [模块化：require/import/include/...](https://github.com/digojs/digo/wiki/模块化)
- [压缩 js/css/html/...](https://github.com/digojs/digo/wiki/压缩)
- [优化：jslint/postcss/...](https://github.com/digojs/digo/wiki/优化)
- [打包上传:zip/apk/upload/...](https://github.com/digojs/digo/wiki/打包上传)

> 提示：[点击这里](https://github.com/digojs/digo/wiki/配置模板)查看更多项目配置模板

文档
-------------------------------
要查看[入门指南](https://github.com/digojs/digo/wiki/入门指南)、[API 文档](https://github.com/digojs/digo/wiki/API)、[插件开发指南](https://github.com/digojs/digo/wiki/编写插件)，请点击[文档页面](https://github.com/digojs/digo/wiki/)。

特性比较和社区
-------------------------------
### Digo vs Gulp
1. Digo 和 Gulp 的功能、接口相似且都具有高性能异步特性。
2. Digo 有更漂亮的错误提示、细节处理更贴心。
3. 使用监听(watch)功能时，Digo 具有绝对性能优势：编译更快；CPU 占用少 10%；内存占用少 300%。
4. Digo 的配置代码更短更简单、且不大需要写死路径，同一个配置文件可以给多个项目使用，相比 Gulp 的配置繁琐很多。

### Digo vs Webpack
1. Digo 本身只是执行任务的工具。通过插件 [digo-web-modular](https://github.com/digojs/digo-web-modular), Digo 提供了和 Webpack 类似的 require/import 等模块依赖打包功能。
2. Webpack 配置繁琐难懂，和 Gulp 同时使用时会发现同样的需求需要两种写法(如 gulp-less 和 less-loader 同时使用)。而digo-web-modular 插件没有自己实现 loader 和 plugin 机制，而是直接利用了 Digo 的既有功能，所以 digo-web-modular 插件配置更简单、也更容易上手和定制。
3. 更多细节比较可以见 [digo-web-modular](https://github.com/digojs/digo-web-modular) 插件文档。即使 digo-web-modular 插件是 webpack 的一种可选替代品，但您仍然可以使用 [digo-webpack](https://github.com/digojs/digo-webpack) 插件来组合使用 Digo 和 Webpack。

### 关于社区
社区支持始终是国内开源项目的硬伤。

我们忠诚地希望得到您的支持，
如果您觉得这个工具不错，请点击右上角的关注。或者您还可以:
- [点击这里](https://github.com/Digo/Digo/issues/new)报告 BUG。
- [点击这里](https://github.com/Digo/Digo/issues/new)提交需求建议。
- 共享一个[插件](https://github.com/digojs/digo/wiki/编写插件)。
- 通过[请求推送(Pull Request)](https://help.github.com/articles/using-pull-requests)帮助我们改进产品质量。


[travis-url]: https://travis-ci.org/digojs/digo
[travis-image]: https://img.shields.io/travis/digojs/digo.svg
[appveyor-url]: https://ci.appveyor.com/project/sokra/digo/branch/master
[appveyor-image]: https://ci.appveyor.com/api/projects/status/github/digojs/digo?svg=true
[coveralls-url]: https://coveralls.io/github/digojs/digo
[coveralls-image]: https://coveralls.io/repos/github/digojs/digo/badge.svg
[npm-url]: https://www.npmjs.com/package/digo
[npm-image]: https://img.shields.io/npm/v/digo.svg
[downloads-image]: https://img.shields.io/npm/dm/digo.svg
[downloads-url]: http://badge.fury.io/js/digo
[david-url]: https://david-dm.org/digojs/digo
[david-image]: https://img.shields.io/david/digojs/digo.svg
[david-dev-url]: https://david-dm.org/digojs/digo#info=devDependencies
[david-dev-image]: https://david-dm.org/digojs/digo/dev-status.svg
[david-peer-url]: https://david-dm.org/digojs/digo#info=peerDependencies
[david-peer-image]: https://david-dm.org/digojs/digo/peer-status.svg
[nodei-image]: https://nodei.co/npm/digo.png?downloads=true&downloadRank=true&stars=true
[nodei-url]: https://www.npmjs.com/package/digo
[donate-url]: http://sokra.github.io/
[donate-image]: https://img.shields.io/badge/donate-sokra-brightgreen.svg
[gratipay-url]: https://gratipay.com/digo/
[gratipay-image]: https://img.shields.io/gratipay/digo.svg
[gitter-url]: https://gitter.im/digojs
[gitter-image]: https://img.shields.io/badge/gitter-digo%2Fdigo-brightgreen.svg
[badginator-image]: https://badginator.herokuapp.com/digojs/digo.svg
[badginator-url]: https://github.com/defunctzombie/badginator
