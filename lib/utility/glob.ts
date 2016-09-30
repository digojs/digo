/**
 * @fileOverview 通配符
 * @author xuld <xuld@vip.qq.com>
 */
import { Matcher, Pattern, getGlobDir, Tester, isGlob } from "./matcher";
import { walkDir } from "./fs";

/**
 * 搜索指定通配符实际匹配的文件。
 */
export function glob(patterns: Pattern[], callbacks: GlobCallbacks) {

}

interface GlobCallbacks {

    ignore(name: string);

    match(name: string);

    error(error: NodeJS.ErrnoException);

    end();

}