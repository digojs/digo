/**
 * @fileOverview 缓存
 * @author xuld <xuld@vip.qq.com>
 */
import { getStat, getFiles } from "../utility/fs";
import { Stats } from "../utility/fsSync";

// /**
//  * 获取或设置缓存文件的地址。如果地址为空则不使用缓存。
//  */
// export var cacheFile = "{USER}/tpak/cache/{PROJECT}.json";

// /**
//  * 获取或设置比较文件使用的算法。
//  */
// export var comparison: FileComparion;

export var cache = false;

export function updateCache(srcPath: string, destPath: string) {

}

export function checkCache(path: string, callback: (result: boolean) => void, stats?: Stats) {

}
