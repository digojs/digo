import * as np from "path";
import * as nu from "url";

/**
 * 解析指定地址对应的绝对地址。
 * @param base 要解析的基地址。
 * @param url 要解析的相对地址或绝对地址。
 * @return 返回已解析的地址。
 * @example resolveUrl("a/b/c", "../d") // "a/d"
 */
export function resolveUrl(base: string, url: string) {
    return nu.resolve(base, url);
}

/**
 * 解析指定地址对应的相对地址。
 * @param base 要解析的基地址。
 * @param url 要解析的相对地址或绝对地址。
 * @return 返回已解析的地址。
 * @example relativeUrl("a/b/c", "a/b/d") // "../d"
 */
export function relativeUrl(base: string, url: string) {

    // 忽略特殊地址。
    if (/^[\w+\-\.]+:(?:[^/]|$)/.test(url)) {
        return url;
    }

    const baseObj = nu.parse(base, false, true);
    const urlObj = nu.parse(url, false, true);

    // 协议不同直接取绝对路径。
    if (baseObj.protocol !== urlObj.protocol) {
        return nu.format(urlObj);
    }

    // 协议相同但主机不同，取协议外的绝对路径。
    if (baseObj.host !== urlObj.host || baseObj.auth !== urlObj.auth) {
        if (urlObj.slashes) {
            delete urlObj.protocol;
        }
        return nu.format(urlObj);
    }

    // base 和 url 必须同时是相对路径或绝对路径，否则不处理。
    if (baseObj.pathname && urlObj.pathname && (baseObj.pathname.charCodeAt(0) === 47/*/*/) !== (urlObj.pathname.charCodeAt(0) === 47/*/*/)) {
        return nu.format(urlObj);
    }

    // 计算相同的开头部分，以分隔符为界。
    base = baseObj.pathname ? np.posix.normalize(baseObj.pathname) : "";
    url = urlObj.pathname ? np.posix.normalize(urlObj.pathname) : "";
    let index = -1;
    for (var i = 0; i < base.length && i < url.length; i++) {
        const ch1 = base.charCodeAt(i);
        const ch2 = url.charCodeAt(i);

        // 发现不同字符后终止。
        if (ch1 !== ch2) {
            break;
        }

        // 如果发现一个分隔符，则之前的内容认为是公共头。
        if (ch1 === 47/*/*/) {
            index = i;
        }

    }

    // 重新追加不同的路径部分。
    let result = url.substr(index + 1) || (i === base.length ? "" : ".");
    for (i = index + 1; i < base.length; i++) {
        if (base.charCodeAt(i) === 47/*/*/) {
            if (result === ".") {
                result = "../";
            } else {
                result = "../" + result;
            }
        }
    }
    return result + (urlObj.search || "") + (urlObj.hash || "");
}

/**
 * 规范化指定地址的格式。
 * @param url 要处理的地址。
 * @return 返回处理后的地址。
 * @example normalizeUrl("abc/") // "abc/"
 * @example normalizeUrl("./abc.js") // "abc.js"
 */
export function normalizeUrl(url: string) {
    if (!url || /^[\w+\-\.]+:(?:[^/]|$)/.test(url)) {
        return url;
    }
    const urlObj = nu.parse(url, false, true);
    if (urlObj.pathname) {
        urlObj.pathname = np.posix.normalize(urlObj.pathname);
    }
    return nu.format(urlObj);
}

/**
 * 判断指定的地址是否是绝对地址。
 * @param url 要判断的地址。
 * @return 如果是绝对地址则返回 true，否则返回 false。
 * @example isAbsoluteUrl("/") // true
 */
export function isAbsoluteUrl(url: string) {
    return /^(?:\/|[\w+\-\.]+:)/.test(url);
}
