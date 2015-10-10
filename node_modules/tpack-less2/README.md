tpack-less
===========================================

提供 LESS 解析支持

## 安装

    > npm install tpack-less -g

## 使用

    require('tpack').build({
        rules: [
            {
                src: "*.less",
                process: require("tpack-less"),
                dest: "*.css"
            }
        ]
    });

