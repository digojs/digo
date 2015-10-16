# tpack 介绍
tpack 是一个使用 NodeJS 开发的项目构建工具。对于前端项目，它可以实现代码预编译、打包、压缩等功能。

## 下载安装

1. 安装 NodeJS 和 npm。具体请参考 [NodeJS 官网](https://nodejs.org)
2. 使用 npm 下载 tpack：

    > npm install -g tpack
  
## 首次使用

### 1. 在项目根目录新建 `tpack.js` 文件：              

    var tpack = require("tpack");
    
    tpack.task("hello-build", function(){
        
        // 定义 .txt 文件的处理方式。
        tpack.src("*.txt")
            .pipe(function(file, options, builder){  
                return file.content.replace(/\s/g, "");
            })
            .dest("$1.out");
        
        // 开始生成。
        tpack.build();
    });

### 2. 执行命令调用：

    > cd <项目根目录>
    > tpack hello-build

### 3. 对示例的解释

示例中，创建了一个名为 `hello-build` 的任务，然后通过命令行调用。

任务的内容为：遍历项目中所有 .txt 文件，删除其内容的空格然后保存为同名的 .out 文件。

## 实时编译(增量发布)

如果需要在文件保存后自动重新生成，修改上述示例为：

    var tpack = require("tpack");

    // 定义 .txt 文件的处理方式。
    tpack.src("*.txt")
        .pipe(function(file, options, builder){  
            return file.content.replace(/\s/g, "");
        })
        .dest("$1.out");

    tpack.task("hello-build", function(){
        // 开始生成。
        tpack.build();
    });

    tpack.task("hello-watch", function(){
        // 开始监听。
        tpack.watch();
    });
    
然后通过命令行调用即可：
    
    > cd <项目根目录>
    > tpack hello-watch

## Web 服务器

tpack 可以自启服务器，此服务器可以在响应时自动生成。

通过服务器可以实现和实时编译相同的功能，并且稳定性高。

    tpack.task("hello-server", function(){
        // 启动服务器。
        tpack.startServer(8080);
    });


## tpack 和 gulp 的区别

Gulp 以任务为中心，每个任务会处理若干文件得到新文件。任务之间是独立的，无法互相获取依赖。

### 相同点

- 都能定义执行任务。
- 都能针对特定文件生成新文件。
- 都能实时编译。

### 不同点

Gulp 将文件列表抽象成流，一个流会经过多个任务依次处理得到结果。如:

	gulp.src("**.js")
		.pipe(uglify())
		.pipe(rename({ suffix: '.min' }));

以上代码将 js 压缩并重命名为 .min.js。任务完成后流即被更新。




- tpack 不需要本地安装。

从总体功能上两者类似，但是实现思路是完全相反的。

Gulp 以任务为中心，每个任务

### 定位
- grunt/gulp 是一个构架工具，它们只负责处理文件，是一个通用的方案。
- tpack 的定位是则是专注于前端项目的工具集，发布工具仅仅是它的一部分功能。

### 使用方式
- gruntfile.js/glup.js 主要用于调用现成的插件来实现需求，随着项目的发展，这个文件会越来越大。
- tpack.js 主要用于描述需求本身，它应该是通用的，项目初期就确定好的，不需要经常更新。

## tpack-web

tpack-web 插件封装了前端项目的常用功能。只需三个命令，即可快速发布您的前端项目。

    > npm install -g tpack-web              # 安装 tpack-web
    > cd <要发布的项目根目录>
    > tpack-web -out ../build/

发布完成后，项目中所有文件都会拷贝到 ../build/，并作了以下处理：

1. 检查 Css/Js/Html 等语法错误。
2. 预编译 Less/Sass、Ee6/Jsx、CoffeeScript 等自定义语法。
3. 打包 AMD/CMD(require) 代码和 #include 指令。
4. 生成 Css 雪碧图。
5. 压缩 Css/Js 文件。
6. 为 Css/Js 引用路径追加时间戳以避免缓存。

除此之外，tpack-web 还提供了：实时编译、模块自动加载、上传到 CDN、AJAX 接口模拟、占位图等功能。
具体请参考 [tpack-web 主页](https://github.com/tpack/tpack-web)

## 文档

要查看入门教程、API 文档、插件开发指南，请进入：[文档页面](文档)

## 支持我们

- 欢迎通过[推送请求](https://help.github.com/articles/using-pull-requests)帮助我们改进产品质量。
- 如果您有任何项目需求和建议，欢迎[发送反馈](https://github.com/tpack/tpack/issues/new)。
