/**
 * @fileOverview 日期扩展
 * @author xuld <xuld@vip.qq.com>
 */

const formators = {
    __proto__: null,
    y: (date: Date, length: number) => {
        const year = date.getFullYear();
        return length < 3 ? year % 100 : year;
    },
    M: (date: Date) => date.getMonth() + 1,
    d: (date: Date) => date.getDate(),
    H: (date: Date) => date.getHours(),
    m: (date: Date) => date.getMinutes(),
    s: (date: Date) => date.getSeconds()
};

/**
 * 格式化指定的日期对象。
 * @param date 要格式化的日期。
 * @param format 格式字符串。其中以下特殊字符会被替换：
 * 
 * 字符  | 意义 | 示例
 * ------|-----|--------------------
 * y     | 年  | yyyy:2014, yy:14
 * M     | 月  | MM:09, M:9
 * d     | 日  | dd:09, d:9
 * H     | 时  | HH:13, h:13
 * m     | 分  | mm:06, m:6
 * s     | 秒  | ss:06, s:6
 *
 * > 注意：特殊字符区分大小写。
 * > 另参考：{@see https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html}
 * @returns 返回格式化后的字符串。
 * @example formatDate(new Date()) // "2016/01/01 00:00:00"
 * @example formatDate(new Date(), "yyyyMMdd") // "20160101"
 */
export function formatDate(date = new Date(), format = "yyyy/MM/dd HH:mm:ss") {
    return format.replace(/(\w)\1*/g, (all: string, key: string) => {
        const formator: (date: Date, length: number) => number = formators[key];
        if (formator) {
            key = formator(date, all.length).toString();
            while (key.length < all.length) {
                key = "0" + key;
            }
            all = key;
        }
        return all;
    });
}

/**
 * 格式化一个高精度时间段。
 * @param time 由秒和纳秒部分组成的数组。
 * @returns 返回格式化后的字符串。
 * @example formatHRTime([1, 20000000]) // "1.02s"
 */
export function formatHRTime(time: number[]) {
    if (time[0] < 1) {
        if (time[1] < 1e4) return "<0.01ms";
        var value = time[1] / 1e6;
        var unit = "ms";
    } else {
        value = time[0] + time[1] / 1e9;
        if (value < 60) {
            unit = "s";
        } else {
            value /= 60;
            unit = "min";
        }
    }
    return value.toFixed(2).replace(/(\.00|0)?$/, unit);
}
