/**
 * @fileOverview 监听
 * @author xuld <xuld@vip.qq.com>
 */
import { FSWatcher } from "../utility/watcher";
import { LogData } from "./logging";
import file = require("./file");
import { matchedFiles } from "./src";

/**
 * 获取或设置当前使用的监听器。
 */
export var watcher: Watcher;

/**
 * 表示一个监听器。
 */
export class Watcher extends FSWatcher {

    /**
     * 获取当前监听器默认执行的任务名。
     */
    task: Function;

    /**
     * 初始化当前监听器。
     * @param 默认执行的任务名。
     */
    constructor(task: Function) {
        super();
        this.task = task;
    }

    /**
     * 当监听到一个文件改变后执行。
     * @param name 相关的名称。
     * @param stats 文件的属性对象。
     */
    protected onChange(name: string) {
        // 计算模块依赖。
       // var modules = { [name: string]: number };

        // const deps = [name];
        // TODO: 所有依赖 path 的文件同时标记为已改变。
        // run(context.task, WorkingMode.build, undefined, deps);
        // task();
        matchedFiles.length = 0;
        matchedFiles.push(name);
        this.task();
    }

    /**
     * 当监听到一个文件或文件夹删除后执行。
     * @param name 相关的名称。
     */
    protected onDelete(name: string) {
        matchedFiles.length = 0;
        matchedFiles.push(name);
        file.workingMode |= file.WorkingMode.clean;
        this.task();
    }

    /**
     * 当发生错误后执行。
     * @param error 相关的错误对象。
     */
    protected onError(error: NodeJS.ErrnoException) { throw error; }

    /**
     * 存储所有模块的依赖关系。
     */
    deps: { [name: string]: string[] };

    /**
     * 添加一个路径的依赖关系。
     * @param name 相关的路径。
     * @param dep 依赖的路径。
     * @param source 设置当前依赖的来源以方便调试。
     * @remark
     * 当依赖的路径发生改变后，当前文件也会改变。
     */
    addDep(name: string, dep: string, source?: LogData) {
        const deps = this.deps[dep] || (this.deps[dep] = []);
        deps.push(name);
        // FIXME: 实现 source 逻辑
    }

    /**
     * 添加一个路径的引用关系。
     * @param path 相关的路径。
     * @param dep 依赖的路径。
     * @param source 设置当前依赖的来源以方便调试。
     */
    addRef(name: string, dep: string, source?: LogData) {
        // FIXME: 实现 source 逻辑
    }

}

/**
 * 以监听方式执行一个任务。
 * @param task 要执行的任务名。
 */
export function watch(task: Function) {
    file.workingMode |= file.WorkingMode.watch;
    watcher = new Watcher(task);
    return task();
}
