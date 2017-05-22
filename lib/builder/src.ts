import { glob } from "../utility/glob";
import { Matcher, Pattern } from "../utility/matcher";
import { getDir, pathEquals } from "../utility/path";
import { asyncQueue } from "./async";
import { emit } from "./events";
import { File } from "./file";
import { FileList } from "./fileList";
import { getDisplayName, verbose } from "./logging";

/**
 * 全局匹配器。
 */
export var globalMatcher = new Matcher();

/**
 * 表示一个根文件列表。
 */
export class RootFileList extends FileList {

    /**
     * 当前列表的根匹配器。
     */
    readonly matcher = new Matcher();

    /**
     * 创建属于当前列表的文件。
     * @param path 要添加的文件对象。
     * @return 返回新建的文件对象。
     */
    createFile(path: string) {
        const base = this.matcher.base!;
        return new File(path, pathEquals(path, base) ? getDir(base!) : base);
    }

    /**
     * 当作为顶级列表时表示所有子列表执行完成后的回调。
     */
    protected done() {
        if (this._locked) {
            this._locked = false;
            asyncQueue.unlock("RootFileList");
        }
    }

    /**
     * 是否已锁定。
     */
    private _locked = false;

    /**
     * 向当前列表添加一个文件。
     * @param file 要添加的文件。
     * @param root 文件所属的根列表。
     */
    add(file: File, root?: FileList) {
        if (!this._locked) {
            this._locked = true;
            asyncQueue.lock("RootFileList");
        }
        super.add(file, root);
    }

    /**
     * 通知当前列表所有文件已添加。
     */
    end() {
        if (!this._locked) {
            this._locked = true;
            asyncQueue.lock("RootFileList");
        }
        super.end();
    }

}

/**
 * 筛选指定的文件并返回一个文件列表。
 * @param patterns 用于筛选文件的通配符、正则表达式、函数或以上组合的数组。
 * @return 返回一个文件列表对象。
 */
export function src(...patterns: (Pattern | File | FileList)[]) {
    const result = new RootFileList();
    let pending = 1;
    asyncQueue.lock("src");
    const done = () => {
        if (--pending < 1) {
            result.end();
            asyncQueue.unlock("src");
        }
    };
    for (const pattern of patterns) {
        if (pattern instanceof FileList) {
            pending++;
            pattern.pipe({
                collect: false,
                add(file) {
                    result.add(file);
                },
                end: done
            });
        } else if (pattern instanceof File) {
            pending++;
            process.nextTick(() => {
                result.add(pattern);
                done();
            });
        } else {
            result.matcher.add(pattern);
        }
    }
    if (result.matcher.patterns.length) {
        glob(result.matcher, {
            globalMatcher: globalMatcher,
            error: verbose,
            ignored(path, global) {
                verbose(global ? "Ignoring globally: {path}" : "Ignoring: {path}", { path: getDisplayName(path) });
            },
            walk(path, stats, entries) {
                emit("addDir", path, stats, entries);
            },
            file(path, stats) {
                result.add(result.createFile(path));
                emit("addFile", path, stats);
            },
            end: done
        });
        emit("addList", result);
    } else {
        done();
    }
    return result;
}
