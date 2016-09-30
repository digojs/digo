/**
 * @fileOverview 对象扩展
 * @author xuld <xuld@vip.qq.com>
 */

/**
 * 设置一个对象的属性值。
 * @param obj 要修改的对象。
 * @param key 要设置的属性名。
 * @param value 要设置的属性值。
 * @returns 返回已修改的对象。
 * @example setProperty({}, "myKey", "myValue")
 */
export function setProperty(obj: any, propertyKey: PropertyKey, value: any) {
    return Object.defineProperty(obj, propertyKey, {
        value: value,
        writable: true,
        enumerable: true,
        configurable: true
    });
}
