const [node, file, path, task] = process.argv
import("file:///" + path.replace(/\\/g, "/")).then(tasks => {
    const fn = tasks[task]
    if (fn) {
        fn()
    } else {
        console.error(`Task "${task}" not found`)
        process.exit(2)
    }
}).catch(e => {
    console.error(e)
    process.exit(1)
})