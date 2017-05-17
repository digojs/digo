import { EventEmitter } from "events";
import * as http from "http";
import * as nu from "url";

/**
 * 表示一个 Http 服务器。
 */
export class HttpServer extends EventEmitter {

    /**
     * 底层 HTTP 服务器。
     */
    private _server = http.createServer(this.processRequest.bind(this))
        .on("listening", this.onStart.bind(this))
        .on("close", this.onStop.bind(this))
        .on("error", this.onError.bind(this));

    /**
     * 判断当前服务器是否正在监听。
     */
    get isListening() { return this._server.listening; }

    /**
     * 获取当前服务器的请求数。
     */
    get connectionCount() { return this._server.connections; }

    /**
     * 当前服务器的超时毫秒数。默认为 120000。
     */
    get timeout() { return this._server.timeout; }
    set timeout(value) { this._server.timeout = value; }

    /**
     * 获取当前服务器的主页地址。
     */
    get url() {
        const addr = this._server.address() || { address: "0.0.0.0", port: 80 };
        return `http://${addr.address === "0.0.0.0" ? "localhost" : addr.address}${addr.port === 80 ? "" : ":" + addr.port}${this.virtualPath}`;
    }

    /**
     * 当前服务器的虚拟路径。
     */
    virtualPath = "/";

    /**
     * 当服务器启动时回调。
     */
    protected onStart() {
        this.emit("start");
    }

    /**
     * 当服务器停止时回调。
     */
    protected onStop() {
        this.emit("stop");
    }

    /**
     * 当服务器错误时执行。
     * @param e 当前发生的错误。
     */
    protected onError(e: NodeJS.ErrnoException) {
        this.emit("error", e);
    }

    /**
     * 当被子类重写时负责处理所有请求。
     * @param req 当前的请求对象。
     * @param res 当前的响应对象。
     */
    protected processRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        this.emit("request", req, res);
    }

    /**
     * 监听指定的地址。
     * @param url 要监听的地址。
     * @param callback 启动完成的回调函数。
     */
    listen(url = "http://0.0.0.0:0/", callback?: () => void) {
        const urlObject = nu.parse(url);
        this.virtualPath = urlObject.path || this.virtualPath;
        this._server.listen(+urlObject.port! || 0, urlObject.hostname, callback);
    }

    /**
     * 关闭当前服务器。
     * @param callback 关闭的回调函数。
     */
    close(callback?: () => void) {
        this._server.close(callback);
    }

}

export interface HttpServer {

    /**
     * 绑定一个服务器启动事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     */
    on(event: "start", listener: () => void): this;

    /**
     * 绑定一个服务器停止事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     */
    on(event: "stop", listener: () => void): this;

    /**
     * 绑定一个请求事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param req 当前的请求对象。
     * * @param res 当前的响应对象。
     */
    on(event: "request", listener: (req: http.IncomingMessage, res: http.ServerResponse) => void): this;

    /**
     * 绑定一个错误事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     * * @param error 相关的错误对象。
     */
    on(event: "error", listener: (error: NodeJS.ErrnoException) => void): this;

    /**
     * 绑定一个事件。
     * @param event 要绑定的事件名。
     * @param listener 要绑定的事件监听器。
     */
    on(event: string | symbol, listener: Function): this;

}

export default HttpServer;
