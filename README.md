# tpack 介绍
tpack 是 NodeJS 开发的前端开发工具集，主要功能有：

1. **项目发布**：前端代码检查、打包、压缩、发布到 CDN。
2. **实时编译**：支持 ES6/JSX、Less、CoffeeScript 等自定义语法实时生成。
3. **前端工具**：AJAX 接口模拟；雪碧图；占位图；自动刷新。
4. **适用任何项目**：下载即可使用。更多插件功能，助力前端开发。

## 下载安装

1. 安装 NodeJS 和 npm。具体请参考 [NodeJS 官网](https://nodejs.org)
2. 使用 npm 下载 tpack：

    > npm install -g tpack

## 项目生成和发布

    > cd <项目跟目录>                 # 切换到项目所在跟目录
    > tpack build -out ../output      # 执行发布操作，生成的文件夹为 output

默认地，tpack 会执行以下操作：

1. 编译 .es6、.less、.coffee 等格式文件（如果有）。
2. 生成 css 内的雪碧图。
3. 内联文件（如 html 内联 html、css、js 或图片）
4. 所有本地静态资源引用地址都会加上文件 MD5 值以避免缓存。
5. 打包 AMD/CMD(require) 模块化代码。
6. 检查 css、js 等语法。
7. 压缩 css、js、图片等。
8. API 文档自动生成（可选）。
9. 其它文件直接复制到目标文件夹。

以上功能的具体使用方法请参考：[项目发布](项目发布)

## 实时生成(增量发布)

执行以下命令即可监听当前项目里的改动并实时编译 .es6、.less、.coffee 等格式文件。

    > cd <项目跟目录>
    > tpack watch

## Web 服务器

执行以下命令即可启动当前目录的服务器，方便测试。

    > cd <项目跟目录>
    > tpack server -port 8080

服务器模式下，可以实现一些简单的请求时编译功能。

## 定制和插件

不同的项目有不同的发布需求，请参考：[定制和插件](定制和插件)
 
要查看开发 API 文档，请参考：[API 文档](API)

## tpack 和 grunt/gulp 的区别

### 定位
- grunt/gulp 是一个构架工具，它们只负责处理文件，是一个通用的方案。
- tpack 的定位是则是专注于前端项目的工具集，发布工具仅仅是它的一部分功能。

### 使用方式
- gruntfile.js/glup.js 主要用于调用现成的插件来实现需求，随着项目的发展，这个文件会越来越大。
- tpack.js 主要用于描述需求本身，它应该是通用的，项目初期就确定好的，不需要经常更新。

## 支持我们

- 欢迎通过[推送请求](https://help.github.com/articles/using-pull-requests)帮助我们改进产品质量。
- 如果您有任何项目需求和建议，欢迎[发送反馈](https://github.com/Teal/tpack/issues/new)。


