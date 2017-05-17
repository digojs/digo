/**
 * 设置一个对象的属性值。
 * @param obj 要修改的对象。
 * @param key 要设置的属性名。
 * @param value 要设置的属性值。
 * @return 返回已修改的对象。
 * @example setProperty({ myKey: "oldValue" }, "myKey", "newValue") // { myKey: "newValue" }
 */
export function setProperty<T>(obj: T, key: keyof T, value: any) {
    return Object.defineProperty(obj, key, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
    }) as T;
}

const dateFormators: any = {
    y: (date: Date, format: string) => {
        const year = date.getFullYear();
        return format.length < 3 ? year % 100 : year;
    },
    M: (date: Date) => date.getMonth() + 1,
    d: (date: Date) => date.getDate(),
    H: (date: Date) => date.getHours(),
    m: (date: Date) => date.getMinutes(),
    s: (date: Date) => date.getSeconds()
};

/**
 * 格式化指定的日期对象。
 * @param date 要处理的日期对象。
 * @param format 格式字符串。其中以下字符(区分大小写)会被替换：
 *
 * 字符| 意义        | 示例
 * ----|------------|--------------------
 * y   | 年         | yyyy: 1999, yy: 99
 * M   | 月         | MM: 09, M: 9
 * d   | 日         | dd: 09, d: 9
 * H   | 时(24小时制)| HH: 13, H: 13
 * m   | 分         | mm: 06, m: 6
 * s   | 秒         | ss: 06, s: 6
 *
 * @return 返回格式化后的字符串。
 * @example formatDate(new Date("2016/01/01 00:00:00")) // "2016/01/01 00:00:00"
 * @example formatDate(new Date("2016/01/01 00:00:00"), "yyyyMMdd") // "20160101"
 * @see https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
 */
export function formatDate(date = new Date(), format = "yyyy/MM/dd HH:mm:ss") {
    return format.replace(/([yMdHms])\1*/g, (all: string, key: string) => {
        key = dateFormators[key](date, all) + "";
        while (key.length < all.length) {
            key = "0" + key;
        }
        return key;
    });
}

/**
 * 格式化指定的高精度时间段。
 * @param hrTime 由秒和纳秒部分组成的数组。
 * @return 返回格式化后的字符串。
 * @example formatHRTime([1, 20000000]) // "1.02s"
 */
export function formatHRTime(hrTime: [number, number]) {
    let value: number;
    let unit: string;
    if (hrTime[0] < 1) {
        if (hrTime[1] < 1e4) {
            return "<0.01ms";
        }
        value = hrTime[1] / 1e6;
        unit = "ms";
    } else {
        value = hrTime[0] + hrTime[1] / 1e9;
        if (value < 60) {
            unit = "s";
        } else {
            value /= 60;
            unit = "min";
        }
    }
    return value.toFixed(2).replace(/(\.00|0)?$/, unit);
}

/**
 * 将对象的字符串表示形式转换为 HTML 编码的字符串。
 * @param value 要编码的字符串。
 * @return 返回已编码的字符串。
 */
export function encodeHTML(value: string) {
    return value.replace(/[&><"]/g, m => ({
        "&": "&amp;",
        ">": "&gt;",
        "<": "&lt;",
        '"': "&quot;"
    } as { [char: string]: string })[m]);
}
