// /**
//  * @fileOverview 文件列表
//  * @author xuld <xuld@vip.qq.com>
//  */
// import { EventEmitter } from "events";
// import { Matcher, Pattern } from "../utility/matcher";
// import { relativePath, resolvePath, pathEquals } from "../utility/path";
// import { beginAsync, endAsync } from "./then";
// import { plugin } from "./plugin";
// import { File } from "./file";

// /**
//  * 表示一个文件列表。
//  */
// export class FileList extends EventEmitter {

//     /**
//      * 获取已添加的所有文件。
//      */
//     files: File[] = [];

//     /**
//      * 在当前列表添加一个文件。
//      * @param file 要添加的文件。
//      */
//     add(file: File) {
//         this.files.push(file);
//         this.emit("data", file);
//     }

//     /**
//      * 获取当前列表是否已处理完成。
//      */
//     protected ended: boolean;

//     /**
//      * 标记所有文件都已添加。
//      */
//     end() {
//         this.ended = true;
//         this.emit("end", this.files);
//     }

//     /**
//      * 绑定一个事件。
//      * @param event 要添加的事件名。
//      * @param listener 要添加的事件监听器。
//      */
//     on(event: "data", listener: (file: File) => void);

//     /**
//      * 绑定一个事件。
//      * @param event 要添加的事件名。
//      * @param listener 要添加的事件监听器。
//      */
//     on(event: "end", listener: (files: File[]) => void);

//     /**
//      * 绑定一个事件。
//      * @param event 要添加的事件名。
//      * @param listener 要添加的事件监听器。
//      */
//     on(event: string, listener: Function);

//     /**
//      * 绑定一个事件。
//      * @param event 要添加的事件名。
//      * @param listener 要添加的事件监听器。
//      */
//     on(event: string, listener: Function) {
//         super.on(event, listener);

//         // 允许事件触发后再绑定事件。
//         switch (event) {
//             case "data":
//                 for (const file of this.files) {
//                     listener.call(this, file);
//                 }
//                 break;
//             case "end":
//                 if (this.ended) {
//                     listener.call(this, this.files);
//                 }
//                 break;
//         }

//         return this;
//     }

//     /**
//      * 将所有文件传递给目标文件列表或处理器。
//      * @param processor 目标文件列表或处理器。
//      * @param options 传递给处理器的只读配置对象。
//      * @return 返回新的文件列表。
//      */
//     pipe<T>(processor: string | Processor<T> | (new (options?: T) => FileList) | FileList, options?: T): FileList {

//         // .pipe("..."): 载入目标插件。
//         if (typeof processor === "string") {
//             processor = <FileList | (new (options?: T) => FileList) | Processor<T>>plugin(processor);
//         }

//         // .pipe(otherList): 直接传递文件。
//         if (processor instanceof FileList) {
//             this.on("data", file => (<FileList>processor).add(file));
//             this.on("end", file => (<FileList>processor).end());
//             return processor;
//         }

//         // .pipe(FileList): 创建目标类型对应的实例。
//         if (processor.prototype instanceof FileList) {
//             return this.pipe(new (<new (options?: T) => FileList>processor)(options));
//         }

//         // 补齐默认参数。
//         const result = new FileList();
//         if (options == undefined) {
//             options = <T>defaultProcessorOptions;
//         }

//         // .pipe(file, options, callback?): 直接处理每个文件。
//         if (processor.length < 4) {
//             let pending = 1; // 需要等待所有 data 事件 + 1 个 end 事件。
//             this.on("data", file => {
//                 pending++;
//                 file.load((error, file) => {
//                     if (error) {
//                         if (--pending > 0) return;
//                         return result.end();
//                     }
//                     const taskId = beginAsync((<Processor<T>>processor).name ? "{processor}: {file}" : "Process: {file}", {
//                         file: file.toString(),
//                         processor: (<Processor<T>>processor).name
//                     });
//                     function done() {
//                         result.add(file);
//                         endAsync(taskId);
//                         if (--pending > 0) return;
//                         result.end();
//                     }
//                     if ((<Processor<T>>processor).length < 3) {
//                         try {
//                             (<Processor<T>>processor)(file, options, null, this, result);
//                         } catch (e) {
//                             file.error(e);
//                         }
//                         done();
//                     } else {
//                         try {
//                             (<Processor<T>>processor)(file, options, done, this, result);
//                         } catch (e) {
//                             file.error(e);
//                             done();
//                         }
//                     }
//                 });
//             });
//             this.on("end", () => {
//                 if (--pending > 0) return;
//                 result.end();
//             });
//         } else {
//             // .pipe(file, options, callback, srcList, destList?): 等待列表加载完成后处理每个文件。
//             this.on("end", files => {
//                 function proc(index: number) {
//                     if (result.ended) return;
//                     if (index >= files.length) {
//                         return result.end();
//                     }
//                     files[index].load((error, file) => {
//                         if (error) {
//                             return proc(index + 1);
//                         }
//                         const taskId = beginAsync((<Processor<T>>processor).name ? "{processor}: {file}" : "Process: {file}", {
//                             processor: (<Processor<T>>processor).name,
//                             file: file.toString()
//                         });
//                         try {
//                             (<Processor<T>>processor)(file, options, function done() {
//                                 if ((<Processor<T>>processor).length < 5) {
//                                     result.add(file);
//                                 }
//                                 endAsync(taskId);
//                                 proc(index + 1);
//                             }, this, result);
//                         } catch (e) {
//                             file.error(e);
//                             endAsync(taskId);
//                             proc(index + 1);
//                         }
//                     });
//                 }
//                 proc(0);
//             });
//         }
//         return result;
//     }

//     /**
//      * 将所有文件移动到指定的文件夹。
//      * @param dir 要保存的目标文件文件夹。如果为空则保存到原文件夹。
//      */
//     dest(dir?: string | ((file: File) => string)) {
//         const result = new FileList();
//         let pending = 1;
//         this.on("data", file => {
//             pending++;
//             file.save(typeof dir === "function" ? dir(file) : dir, (error, file) => {
//                 result.add(file);
//                 if (--pending > 0) return;
//                 result.end();
//             });
//         });
//         this.on("end", () => {
//             if (--pending > 0) return;
//             result.end();
//         });
//         return result;
//     }

//     /**
//      * 删除所有源文件。
//      * @param deleteDir 指示是否删除空的父文件夹。默认为 true。
//      */
//     delete(deleteDir: boolean) {
//         const result = new FileList();
//         let pending = 1;
//         this.on("data", file => {
//             pending++;
//             file.delete(deleteDir, (error, file) => {
//                 result.add(file);
//                 if (--pending > 0) return;
//                 result.end();
//             });
//         });
//         this.on("end", () => {
//             if (--pending > 0) return;
//             result.end();
//         });
//         return result;
//     }

//     /**
//      * 获取当前列表中的指定文件。
//      * @param path 要获取的文件路径。
//      * @return 返回文件对象。如果找不到则返回 undefined。
//      */
//     get(path: string) {
//         path = resolvePath(path);
//         for (const file of this.files) {
//             if (pathEquals(file.path, path)) {
//                 return file;
//             }
//         }
//     }

//     /**
//      * 筛选当前文件列表并返回一个新的文件列表。
//      * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上组合的数组。
//      * @returns 返回一个文件列表对象。
//      */
//     src(...patterns: Pattern[]) {
//         const result = new FileList();
//         const matcher = new Matcher(patterns);
//         this.on("data", file => {
//             if (matcher.test(file.path)) {
//                 result.add(file);
//             }
//         });
//         this.on("end", () => result.end());
//         return result;
//     }

//     /**
//      * 合并当前列表和指定的列表组成新列表。
//      * @param others 要合并的列表或文件。
//      * @return 返回一个新文件列表对象。
//      */
//     concat(...others: (File | FileList)[]) {
//         const result = new FileList();
//         let pending = 1;
//         function addList(list: FileList) {
//             pending++;
//             list.on("data", file => result.add(file));
//             list.on("end", () => {
//                 if (--pending > 0) return;
//                 result.end();
//             });
//         }
//         addList(this);
//         for (const other of others) {
//             if (other instanceof File) {
//                 result.add(other);
//             } else {
//                 addList(other);
//             }
//         }
//         if (--pending <= 0) result.end();
//         return result;
//     }

// }

// /**
//  * 表示一个处理器。
//  * @param file 要处理的文件。
//  * @param options 传递给处理器的只读选项。
//  * @param done 如果是异步操作，则用于指示异步操作完成的回调函数。
//  * @param srcList 源文件列表。
//  * @param destList 目标文件列表。
//  */
// export type Processor<T> = (file: File, options: T, done?: () => void, srcList?: FileList, destList?: FileList) => void;

// /**
//  * 默认配置对象。
//  */
// const defaultProcessorOptions = Object.freeze({});
