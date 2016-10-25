import * as assert from "assert";
import * as np from "path";
import * as matcher from "../../lib/utility/matcher";

export namespace matcherTest {

    export function testTest() {
        assert.equal(match(null, 'foo.js'), true);
        assert.equal(match("foo", "foo"), true);
        assert.equal(match("foo", "myfoo"), false);
        assert.equal(match("foo.js", "foo"), false);
        assert.equal(match("foo/goo", "foo/goo2"), false);
        assert.equal(match("foo.js", "foo.js"), true);
        assert.equal(match('path/to/*.js', 'path/to/foo.js'), true);
        assert.equal(match('path/to/*.js', 'path/to/foo.css'), false);
        assert.equal(match('path/to/*.js', 'path/to.js'), false);
        assert.equal(match('path/to/*.js', 'path/to/foo/goo.js'), false);
        assert.equal(match('/root/path/to/*.js', 'root/path/to/foo.js'), true);
        assert.equal(match('/root/path/to/*.js', 'root/path/toa/foo.js'), false);
        assert.equal(match('/*.js', 'foo.js'), true);
        assert.equal(match('/*.js', 'foo/goo.js'), false);
        assert.equal(match('*.js', 'foo.js'), true);
        assert.equal(match('*.js', 'goo/foo.js'), true);
        assert.equal(match('*.js', 'foo/goo/.js'), true);
        assert.equal(match('**/*.js', 'foo/goo/.js'), true);
        assert.equal(match('f**o/*.js', 'foo/goo/.js'), true);
        assert.equal(match('**/*.js', '.js'), true);
        assert.equal(match('path/?', 'path/a'), true);
        assert.equal(match('path/?', 'path/ab'), false);
        assert.equal(match('path/[ab]', 'path/a'), true);
        assert.equal(match('path/[ab]', 'path/b'), true);
        assert.equal(match('path/[ab]', 'path/ab'), false);
        assert.equal(match('path/[^ab]', 'path/a'), false);
        assert.equal(match('path/[^ab]', 'path/b'), false);
        assert.equal(match('path/[^ab]', 'path/c'), true);
        assert.equal(match('path/*', 'path/'), false);
        assert.equal(match('path/*', 'path/foo'), true);
        assert.equal(match('path/foo*', 'path/foo'), true);
        assert.equal(match('path/a*', 'path/abcd'), true);
        assert.equal(match('path/foo/', 'path/foo/goo'), true);
        assert.equal(match('path/*/', 'path/foo/goo'), true);
        assert.equal(match('path/*/', 'path/foo'), false);
        assert.equal(match('path/*', 'path/foo'), true);
        assert.equal(match('path/foo/', 'path/foo/'), false);
        assert.equal(match('path/**/*', 'path/'), false);
        assert.equal(match('path/**/*', 'path/foo'), true);
        assert.equal(match('path/**/subdir/foo.*', 'path/subdir/foo.js'), true);
        assert.equal(match('path/**/subdir/foo.*', 'path/foo/subdir/foo.js'), true);
        assert.equal(match('path/**/subdir/foo.*', 'path/foo/subdir/foo1.js'), false);
        assert.equal(match('path/**/subdir/foo.*', 'path/foo/subdir/foo'), false);
        assert.equal(match('path/**/subdir/foo.*', 'path/foo/foo2/subdir/foo.txt'), true);
        assert.equal(match('path/**/subdir/foo.*', 'path/foo/foo2/subdir/foo'), false);
        assert.equal(match('./path/**/subdir/foo.*', 'path/foo/foo2/subdir/foo.txt'), true);
        assert.equal(match('./path/**/subdir/foo.*', 'path/foo/foo2/subdir/foo.txt'), true);
        assert.equal(match('../path/**/subdir/foo.*', '../path/foo/foo2/subdir/foo.txt'), true);

        assert.equal(match(['../path/**/subdir/foo.*', "!foo.txt"], '../path/foo/foo2/subdir/Foo.txt'), false);
        assert.equal(match(file => true, 'foo.js'), true);
        assert.equal(match([file => true, "!foo.js"], 'foo.js'), false);
        assert.equal(match(file => false, 'foo.js'), false);
        assert.equal(match("\\foo.js", 'foo.js'), true);
        assert.equal(match("\\*.js", 'foo.js'), false);
        assert.equal(match("[.js", '[.js'), true);
        assert.equal(match(null, 'foo.js'), true);

        assert.equal(match(/foo\.js/, 'foo.js'), true);
        assert.equal(match(new matcher.Matcher(/foo\.js/, "!goo.js"), 'goo.js'), false);
        assert.equal(match(new matcher.Matcher(/foo\.js/).addIgnore("goo.js"), 'goo.js'), false);

        function match(pattern: matcher.Pattern, source: string) {
            return new matcher.Matcher(pattern).test(np.resolve(source));
        }
    }

    export function baseTest() {
        assert.equal(new matcher.Matcher("foo").base, np.resolve(".") + np.sep);
        assert.equal(new matcher.Matcher('path/to/*.js').base, np.resolve('path/to') + np.sep);
        assert.equal(new matcher.Matcher('/root/path/to/*.js').base, np.resolve('root/path/to') + np.sep);
        assert.equal(new matcher.Matcher('/*.js').base, np.resolve('.') + np.sep);
        assert.equal(new matcher.Matcher('*.js').base, np.resolve('.') + np.sep);
        assert.equal(new matcher.Matcher('**/*.js').base, np.resolve('.') + np.sep);
        assert.equal(new matcher.Matcher('path/?').base, np.resolve('path/') + np.sep);
        assert.equal(new matcher.Matcher('path/foo[ab]').base, np.resolve('path/') + np.sep);
        assert.equal(new matcher.Matcher('path/*').base, np.resolve('path/') + np.sep);
        assert.equal(new matcher.Matcher('path/foo*').base, np.resolve('path/') + np.sep);
        assert.equal(new matcher.Matcher('path/**/*').base, np.resolve('path/') + np.sep);
        assert.equal(new matcher.Matcher('path/**/subdir/foo.*').base, np.resolve('path') + np.sep);
        assert.equal(new matcher.Matcher("foo/").base, np.resolve("foo/") + np.sep);
        assert.equal(new matcher.Matcher(["foo/goo", "foo/foo"]).base, np.resolve("foo") + np.sep);
        assert.equal(new matcher.Matcher(["foo/**/*.js", "foo/**/*.css"]).base, np.resolve("foo") + np.sep);
        assert.equal(new matcher.Matcher(/foo/).base, np.resolve("") + np.sep);
        assert.equal(new matcher.Matcher(["foo/", "!foo/"]).base, np.resolve("foo") + np.sep);
        assert.equal(new matcher.Matcher(["../foo/**/*.js", "foo/**/*.css"]).base, np.resolve("..") + np.sep);
        assert.equal(new matcher.Matcher(["../foo/**/*.js", /foo/]).base, np.resolve("..") + np.sep);
    }

}
