import { spawnSync } from "child_process";
import * as np from "path";
import { parse } from "url";
import { copyDirIf, createDir, deleteDir, ensureNewPath, existsDir, existsFile, moveFile, writeFile } from "../utility/fs";
import { exec } from "./exec";
import { fatal, getDisplayName, log, LogLevel } from "./logging";
import { begin, end } from "./progress";

/**
 * 初始化新的 digofile.js。
 * @param type 要初始化的框架名。
 * @return 如果生成成功则返回 true，否则返回 false。
 */
export function init(type?: string) {
    if (!type) {
        if (existsFile("digofile.js")) {
            fatal("'digofile.js' exists already. Nothing done.");
            return false;
        }
        try {
            writeFile("digofile.js", `var digo = require("digo");

exports.build = function () {
    digo.src("./src").dest("./dest");
};

exports.default = function () {
    digo.watch(exports.build);
};
`);
        } catch (e) {
            fatal(e);
            return false;
        }
        log("{brightGreen:Done!} 'digofile.js' created successfully.", {}, LogLevel.info);
        return true;
    }

    // 提取路径信息。
    const url = parse(type, false, true);
    const git = url.host ? (url.protocol || "https:") + "//" + url.host : "https://github.com";
    const branch = url.hash && url.hash.slice(1) || "master";
    const pathParts = (url.pathname || "").replace(/^\//, "").split("/");
    const path = pathParts.length <= 1 ? "/digojs/digofiles" : "/" + pathParts[0] + "/" + pathParts[1];
    const dir = pathParts.length <= 1 ? pathParts[0] : pathParts.slice(2).join("/");
    const readableUrl = git === "https://github.com" ? `${git}${path}/tree/${branch}/${dir}` : `${git}${path}#${branch} ${dir}`;

    const taskId = begin("Downloading: {url}", { url: readableUrl });

    // 获取并创建临时文件夹。
    const tmpDir = ensureNewPath(np.join(require("os").tmpDir(), "__digo_init")) + np.sep;
    createDir(tmpDir);
    try {
        let result = spawnSync("git init", { shell: true, cwd: tmpDir });
        if (result.status !== 0) {
            deleteDir(tmpDir);
            end(taskId);
            fatal("Git is not installed properly, please download {bright:url} manually: {error}", {
                url: readableUrl,
                error: result.error || result.stderr || "Unknown error"
            });
            return false;
        }
        if (dir) {
            spawnSync("git config core.sparseCheckout true", { shell: true, cwd: tmpDir });
            writeFile(tmpDir + ".git/info/sparse-checkout", `/${dir}/**`);
        }
        result = spawnSync(`git pull ${git}${path} ${branch}`, { shell: true, cwd: tmpDir });
        if (result.status !== 0) {
            deleteDir(tmpDir);
            end(taskId);
            fatal("Cannot download {bright:url}: {error}", {
                url: readableUrl,
                error: result.error || result.stderr || "Unknown error"
            });
            return false;
        }
        deleteDir(tmpDir + ".git");
        if (!existsDir(tmpDir + dir)) {
            deleteDir(tmpDir);
            end(taskId);
            fatal("Cannot find '{dir}' from {url}#{branch}", { url: git + path, branch, dir });
            return false;
        }
        copyDirIf(tmpDir + dir, ".");
    } finally {
        deleteDir(tmpDir);
        end(taskId);
    }
    log("{brightGreen:Done!} Project initialized successfully.", {}, LogLevel.info);
    return true;
}
