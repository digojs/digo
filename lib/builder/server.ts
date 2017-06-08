import { EventEmitter } from "events";
import * as http from "http";
import * as nu from "url";
import { encodeHTML } from "../utility/lang";
import { stringToBuffer } from "../utility/encode";
import { AsyncCallback } from "../utility/asyncQueue";
import { HttpServer } from "../utility/httpServer";
import { Matcher, Pattern } from "../utility/matcher";
import { getExt, resolvePath, inDir, relativePath, pathEquals } from "../utility/path";
import { readFile, getStat, readDir } from "../utility/fs";
import { asyncQueue, then } from "./async";
import { off, on } from "./events";
import * as file from "./file";
import { error } from "./logging";
import { watch, watcher } from "./watch";
import { plugin } from "./plugin";

/**
 * 表示一个服务器。
 */
export class Server extends HttpServer {

    /**
     * 当被子类重写时负责处理所有请求。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     */
    protected processRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const parts = req.url!.split("?", 2);
        const url = parts[0];
        for (const handler of this.handlers) {
            if (handler.matcher.test(url) && handler.process(req, res) === false) {
                return;
            }
        }
        const path = this.urlToPath(url);
        if (path == null) {
            this.writeError(req, res, 400, url);
            return;
        }
        getStat(path, (error, stats) => {
            if (error) {
                if (error.code === "ENOENT") {
                    this.writeError(req, res, 404, path);
                } else if (error.code === "EPERM") {
                    this.writeError(req, res, 403, path);
                } else {
                    this.writeError(req, res, 400, path);
                }
            } else if (stats.isDirectory()) {
                // 修复 /path/to 为 /path/to/
                if (url.charCodeAt(url.length - 1) !== 47 /*/*/) {
                    const newUrl = url + "/" + (parts[1] || "");
                    res.writeHead(302, {
                        ...this.headers,
                        Location: newUrl
                    });
                    res.end(`Object Moved To <a herf="${newUrl}">${newUrl}</a>`);
                } else {
                    const checkDefaultPage = (index: number) => {
                        if (index < this.defaultPages.length) {
                            const defaultPage = path + this.defaultPages[index];
                            readFile(defaultPage, (error, data) => {
                                if (error) {
                                    if (error.code === "ENOENT") {
                                        checkDefaultPage(index + 1);
                                    } else {
                                        this.writeError(req, res, 400, defaultPage);
                                    }
                                } else {
                                    this.writeFile(req, res, 200, defaultPage, data);
                                }
                            });
                        } else {
                            this.writeDir(req, res, path);
                        }
                    };
                    checkDefaultPage(0);
                }
            } else {
                this.writeFile(req, res, 200, path);
            }
        });
    }

    /**
     * 获取所有处理器。
     */
    handlers: { matcher: Matcher | RegExp, process(req: http.ServerRequest, res: http.ServerResponse): boolean | void }[] = [{
        matcher: /.*/,
        process: (req, res) => {
            if (req.method === "OPTIONS") {
                if (this.crossOrigin) {
                    res.writeHead(200, this.getCoressOriginHeaders(req));
                } else {
                    this.writeError(req, res, 405);
                }
                res.end();
                return false;
            }
        }
    }];

    /**
     * 向指定的请求写入文件。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     * @param statusCode 请求的错误码。
     * @param path 相关的路径。
     * @param data 相关的内容。
     */
    writeFile(req: http.IncomingMessage, res: http.ServerResponse, statusCode: number, path: string, data?: string | Buffer) {
        if (data === undefined) {
            readFile(path, (error, data) => {
                if (error) {
                    this.writeError(req, res, 500, path, error.message);
                } else {
                    this.writeFile(req, res, statusCode, path, data);
                }
            });
            return;
        }
        if (typeof data === "string") {
            data = stringToBuffer(data);
        }
        res.writeHead(statusCode, {
            ...this.headers,
            ...(this.crossOrigin ? this.getCoressOriginHeaders(req) : {}),
            "Content-Type": this.mimeTypes[getExt(path).toLowerCase()] || this.mimeTypes["*"],
            "Content-Length": data.length,
        });
        res.end(data);
    }

    /**
     * 向指定的请求写入目录。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     * @param statusCode 请求的错误码。
     * @param path 相关的路径。
     * @param data 相关的内容。
     */
    writeDir(req: http.IncomingMessage, res: http.ServerResponse, path: string) {
        readDir(path, (error, entries) => {
            if (error) {
                this.writeError(req, res, 400, path, error.message);
            } else {
                let pending = entries.length;
                const dirs: string[] = [];
                const files: string[] = [];
                const done = () => {
                    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${encodeHTML(path)}</title>
    <style>
        body {
            font-family: Courier New;
            line-height: 135%;
        }
        ul {
            list-style: none;
        }
    </style>
</head>
<body>
    <h1>${encodeHTML(path)}</h1>
    <ul>`;
                    if (!pathEquals(path, this.options.root!)) {
                        html += `       <li><a href="../">../</a></li>\n`;
                    }

                    dirs.sort();
                    for (const dir of dirs) {
                        html += `       <li><a href="${dir}/">${dir}/</a></li>\n`;
                    }

                    files.sort();
                    for (const file of files) {
                        html += `       <li><a href="${file}">${file}</a></li>\n`;
                    }

                    html += `
    </ul>
</body>
</html>`;

                    const buffer = stringToBuffer(html);
                    res.writeHead(200, {
                        ...this.headers,
                        ...(this.crossOrigin ? this.getCoressOriginHeaders(req) : {}),
                        "Content-Type": "text/html",
                        "Content-Length": buffer.length
                    });
                    res.end(buffer);
                };
                if (pending) {
                    for (const entry of entries) {
                        getStat(path + "/" + entry, (error, stats) => {
                            if (!error && stats.isDirectory()) {
                                dirs.push(entry);
                            } else {
                                files.push(entry);
                            }
                            if (--pending < 1) {
                                done();
                            }
                        });
                    }
                } else {
                    done();
                }
            }
        });
    }

    /**
     * 向指定的请求写入错误。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     * @param statusCode 请求的错误码。
     * @param path 相关的路径。
     */
    writeError(req: http.IncomingMessage, res: http.ServerResponse, statusCode: number, path?: string, data?: string) {
        res.writeHead(statusCode, this.headers);
        res.end(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${statusCode} - ${http.STATUS_CODES[statusCode]}: ${encodeHTML(path || req.url!)}</title>
</head>
<body>
    <pre>${statusCode} - ${http.STATUS_CODES[statusCode]}: ${encodeHTML(path || req.url!)}
${data || ""}</pre>
</body>
</html>`);
    }

    /**
     * 是否允许服务器跨域。
     */
    crossOrigin = true;

    /**
     * 当被子类重写时负责生成跨域头。
     * @param req 当前的请求对象。
     * @return 返回用于指示跨域的头。
     */
    protected getCoressOriginHeaders(req: http.IncomingMessage) {
        return {
            "Access-Control-Allow-Origin": req.headers["Origin"] || "*",
            "Access-Control-Allow-Methods": req.headers["Access-Control-Request-Method"] || "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": req.headers["Access-Control-Request-Headers"] || "X-Requested-With",
            "Access-Control-Allow-Credentials": "true"
        };
    }

    /**
     * 当服务器错误时执行。
     * @param e 当前发生的错误。
     */
    protected onError(e: NodeJS.ErrnoException) {
        if (e.code === "EADDRINUSE" || e.code === "EACCES") {
            const port = /:(\d+)/.exec(e.message);
            if (port) {
                error("Cannot start server: Port '{bright:port}' is used by other programs.", { port: port[1] });
            } else {
                error(e);
            }
        } else {
            error(e);
        }
    }

    /**
     * 初始化新的服务器。
     * @param options 服务器的配置。
     */
    constructor(public options: ServerOptions = {}) {
        super();
        if (options.port) {
            options.url = "http://0.0.0.0:" + options.port;
        }
        options.root = resolvePath(options.root || "");
        for (const glob in options.handlers!) {
            const processor = options.handlers![glob];
            this.handlers.push({
                matcher: new Matcher(glob),
                process: typeof processor === "string" ? plugin(processor) : processor
            });
        }
        if (options.plugins) {
            if (Array.isArray(options.plugins)) {
                for (const pluginName of options.plugins) {
                    const pluginFunc = typeof pluginName === "string" ? plugin(pluginName) : pluginName;
                    pluginFunc(this, {});
                }
            } else {
                for (const pluginName in options.plugins) {
                    const option = options.plugins[pluginName];
                    plugin(pluginName)(this, option === undefined ? {} : option);
                }
            }
        }
    }

    /**
     * 启动服务器。
     * @param callback 启动的回调函数。
     */
    start(callback?: AsyncCallback) {
        then(() => new Promise(resolve => {
            this.listen(this.options.url, resolve);
        }));
        if (this.options.task) {
            watch(this.options.task);
        }
        if (callback) {
            then(callback);
        }
    }

    /**
     * 关闭当前服务器。
     * @param callback 关闭的回调函数。
     */
    close(callback?: AsyncCallback) {
        if (watcher) {
            then(() => new Promise(done => {
                watcher!.close(done);
            }));
        }
        then(() => new Promise(done => {
            super.close(done);
        }));
        if (callback) {
            then(callback);
        }
    }

    /**
     * 将指定的物理路径转为网址。
     * @param path 要转换的物理路径。
     * @return 返回网址。如果转换失败则返回 null。
     */
    pathToUrl(path: string) {
        if (!inDir(this.options.root!, path)) {
            return null;
        }
        path = relativePath(this.options.root!, path);
        if (path == ".") path = "";
        return this.url + path;
    }

    /**
     * 将指定的地址转为物理路径。
     * @param url 要转换的网址。
     * @return 返回物理路径。如果转换失败则返回 null。
     */
    urlToPath(url: string) {
        if (!url.toLowerCase().startsWith(this.virtualPath.toLowerCase())) {
            return null;
        }
        return resolvePath(this.options.root!, url.substr(this.virtualPath.length));
    }

    /**
     * 获取各扩展名的默认 MIME 类型。
     */
    mimeTypes: { [key: string]: string; } = {
        "*": "application/octet-stream",
        ".html": "text/html",
        ".htm": "text/html",
        ".inc": "text/html",
        ".tpl": "text/html",
        ".vue": "text/html",
        ".css": "text/css",
        ".less": "text/css",
        ".scss": "text/css",
        ".sass": "text/css",
        ".styl": "text/css",
        ".js": "text/javascript",
        ".jsx": "text/javascript",
        ".ts": "text/javascript",
        ".tsx": "text/javascript",
        ".coffee": "text/javascript",
        ".cljs": "text/javascript",
        ".txt": "text/plain",
        ".text": "text/plain",
        ".xml": "text/xml",
        ".json": "application/json",
        ".map": "application/json",

        ".bmp": "image/bmp",
        ".png": "image/png",
        ".jpg": "image/jpg",
        ".jpeg": "image/jpeg",
        ".jpe": "image/jpeg",
        ".gif": "image/gif",
        ".fax": "image/fax",
        ".jfif": "image/jpeg",
        ".webp": "image/webp",
        ".wbmp": "image/vnd.wap.wbmp",
        ".ico": "image/icon",

        ".eot": "application/vnd.ms-fontobject",
        ".woff": "application/x-font-woff",
        ".woff2": "application/font-woff",
        ".svg": "image/svg+xml",
        ".tif": "image/tiff",
        ".tiff": "image/tiff",
        ".ttf": "application/octet-stream",
        ".cur": "application/octet-stream",

        ".swf": "application/x-shockwave-flash",
        ".swfl": "application/x-shockwave-flash",
        ".3gp": "video/3gpp",
        ".mid": "audio/midi",
        ".midi": "audio/midi",
        ".mov": "video/quicktime",
        ".movie": "video/x-sgi-movie",
        ".mp2": "audio/x-mpeg",
        ".mp3": "audio/x-mpeg",
        ".mp4": "video/mp4",
        ".mpc": "application/vnd.mpohun.certificate",
        ".mpe": "video/mpeg",
        ".mpeg": "video/mpeg",
        ".mpg": "video/mpeg",
        ".mpg4": "video/mp4",
        ".mpga": "audio/ mpeg",
        ".ogg": "audio/ogg"
    };

    /**
     * 获取自动插入的 HTTP 头。
     */
    headers: { [key: string]: string; } = {
        Server: "digo-dev-server/1.0"
    };

    /**
     * 获取默认首页。
     */
    defaultPages: string[] = [];

    /**
     * 存储所有文件的内容。
     */
    readonly files: { [path: string]: Buffer; } = { __proto__: null! };

    /**
     * 当文件更新后隐藏当前文件。
     * @param path 当前写入的文件路径。
     * @param buffer 当前写入的文件内容。
     */
    saveFile(path: string, buffer: Buffer | null) {
        if (buffer === null) {
            delete this.files[path.toLowerCase()];
        } else {
            this.files[path.toLowerCase()] = buffer;
        }
    }

}

/**
 * 表示服务器选项。
 */
export interface ServerOptions {

    /**
     * 服务器地址。
     */
    url?: string;

    /**
     * 服务器端口。
     */
    port?: number;

    /**
     * 所有文件的根目录。
     */
    root?: string;

    /**
     * 所有处理器。
     */
    handlers?: { [glob: string]: ((req: http.ServerRequest, res: http.ServerResponse) => boolean | void) | string; };

    /**
     * 所有插件。
     */
    plugins?: (((server: Server, options: any) => void) | string)[] | { [plugin: string]: any };

    /**
     * 要执行的任务函数。
     */
    task?: AsyncCallback;

}

/**
 * 当前的开发服务器。
 */
export var server: Server | null = null;

/**
 * 启动服务器。
 * @param options 服务器配置。
 * @return 返回服务器对象。
 */
export function startServer(options?: ServerOptions) {
    if (server) {
        server.close();
    }
    server = new Server(options);
    server.start();
    return server;
}
