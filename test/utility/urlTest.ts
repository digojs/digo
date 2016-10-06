import "source-map-support/register";
import * as assert from "assert";
import * as url from "../../lib/utility/url";

export namespace urlTest {

    export function resolveUrlTest() {
        assert.equal(url.resolveUrl('foo', ''), 'foo');
        assert.equal(url.resolveUrl('foo', '.'), '');
        assert.equal(url.resolveUrl('foo', '..'), '..');
        assert.equal(url.resolveUrl('foo', 'goo'), 'goo');
        assert.equal(url.resolveUrl('foo', 'goo/'), 'goo/');
        assert.equal(url.resolveUrl('foo', 'goo//'), 'goo//');
        assert.equal(url.resolveUrl('foo', './goo'), 'goo');
        assert.equal(url.resolveUrl('foo', '../goo'), '../goo');
        assert.equal(url.resolveUrl('foo', '/goo'), '/goo');
        assert.equal(url.resolveUrl('foo', '//goo'), '//goo');
        assert.equal(url.resolveUrl('foo', '?goo=1'), 'foo?goo=1');
        assert.equal(url.resolveUrl('foo', '#goo'), 'foo#goo');
        assert.equal(url.resolveUrl('foo', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('foo', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('foo/', ''), 'foo/');
        assert.equal(url.resolveUrl('foo/', '.'), 'foo/');
        assert.equal(url.resolveUrl('foo/', '..'), '');
        assert.equal(url.resolveUrl('foo/', 'goo'), 'foo/goo');
        assert.equal(url.resolveUrl('foo/', 'goo/'), 'foo/goo/');
        assert.equal(url.resolveUrl('foo/', 'goo//'), 'foo/goo//');
        assert.equal(url.resolveUrl('foo/', './goo'), 'foo/goo');
        assert.equal(url.resolveUrl('foo/', '../goo'), 'goo');
        assert.equal(url.resolveUrl('foo/', '/goo'), '/goo');
        assert.equal(url.resolveUrl('foo/', '//goo'), '//goo');
        assert.equal(url.resolveUrl('foo/', '?goo=1'), 'foo/?goo=1');
        assert.equal(url.resolveUrl('foo/', '#goo'), 'foo/#goo');
        assert.equal(url.resolveUrl('foo/', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('foo/', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('foo/goo', ''), 'foo/goo');
        assert.equal(url.resolveUrl('foo/goo', '.'), 'foo/');
        assert.equal(url.resolveUrl('foo/goo', '..'), '');
        assert.equal(url.resolveUrl('foo/goo', 'hoo'), 'foo/hoo');
        assert.equal(url.resolveUrl('foo/goo', 'hoo/'), 'foo/hoo/');
        assert.equal(url.resolveUrl('foo/goo', 'hoo//'), 'foo/hoo//');
        assert.equal(url.resolveUrl('foo/goo', './hoo'), 'foo/hoo');
        assert.equal(url.resolveUrl('foo/goo', '../hoo'), 'hoo');
        assert.equal(url.resolveUrl('foo/goo', '/hoo'), '/hoo');
        assert.equal(url.resolveUrl('foo/goo', '//hoo'), '//hoo');
        assert.equal(url.resolveUrl('foo/goo', '?hoo=1'), 'foo/goo?hoo=1');
        assert.equal(url.resolveUrl('foo/goo', '#hoo'), 'foo/goo#hoo');
        assert.equal(url.resolveUrl('foo/goo', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('foo/goo', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('', ''), '');
        assert.equal(url.resolveUrl('', '.'), '');
        assert.equal(url.resolveUrl('', '..'), '..');
        assert.equal(url.resolveUrl('', 'goo'), 'goo');
        assert.equal(url.resolveUrl('', 'goo/'), 'goo/');
        assert.equal(url.resolveUrl('', 'goo//'), 'goo//');
        assert.equal(url.resolveUrl('', './goo'), 'goo');
        assert.equal(url.resolveUrl('', '../goo'), '../goo');
        assert.equal(url.resolveUrl('', '/goo'), '/goo');
        assert.equal(url.resolveUrl('', '//goo'), '//goo');
        assert.equal(url.resolveUrl('', '?goo=1'), '?goo=1');
        assert.equal(url.resolveUrl('', '#goo'), '#goo');
        assert.equal(url.resolveUrl('', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('//www.example.com', ''), '//www.example.com');
        assert.equal(url.resolveUrl('//www.example.com', '.'), '//www.example.com/');
        assert.equal(url.resolveUrl('//www.example.com', '..'), '//www.example.com/');
        assert.equal(url.resolveUrl('//www.example.com', 'goo'), '//www.example.com/goo');
        assert.equal(url.resolveUrl('//www.example.com', 'goo/'), '//www.example.com/goo/');
        assert.equal(url.resolveUrl('//www.example.com', 'goo//'), '//www.example.com/goo//');
        assert.equal(url.resolveUrl('//www.example.com', './goo'), '//www.example.com/goo');
        assert.equal(url.resolveUrl('//www.example.com', '../goo'), '//www.example.com/goo');
        assert.equal(url.resolveUrl('//www.example.com', '/goo'), '//www.example.com/goo');
        assert.equal(url.resolveUrl('//www.example.com', '//goo'), '//goo');
        assert.equal(url.resolveUrl('//www.example.com', '?goo=1'), '//www.example.com?goo=1');
        assert.equal(url.resolveUrl('//www.example.com', '#goo'), '//www.example.com#goo');
        assert.equal(url.resolveUrl('//www.example.com', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('//www.example.com', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('.', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');
        assert.equal(url.resolveUrl('.', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('../', 'foo'), '../foo');
        assert.equal(url.resolveUrl('../', 'foo/'), '../foo/');
        assert.equal(url.resolveUrl('../', 'foo//'), '../foo//');

        assert.equal(url.resolveUrl('../', '../'), '../../');
        assert.equal(url.resolveUrl('../', '../foo'), '../../foo');

        assert.equal(url.resolveUrl('../', '.'), '../');
        assert.equal(url.resolveUrl('../', './foo'), '../foo');

        assert.equal(url.resolveUrl('../', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('../', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('foo', 'goo?hoo=1'), 'goo?hoo=1');
        assert.equal(url.resolveUrl('foo/', ''), 'foo/');
        assert.equal(url.resolveUrl('foo/', '.'), 'foo/');
        assert.equal(url.resolveUrl('foo//', ''), 'foo//');
        assert.equal(url.resolveUrl('foo//', '.'), 'foo/');
        assert.equal(url.resolveUrl('/foo', ''), '/foo');
        assert.equal(url.resolveUrl('/foo', '.'), '/');
        assert.equal(url.resolveUrl('', ''), '');
        assert.equal(url.resolveUrl('.', ''), '.');
        assert.equal(url.resolveUrl('.', '.'), '');
        assert.equal(url.resolveUrl('..', ''), '..');
        assert.equal(url.resolveUrl('..', '.'), '');
        assert.equal(url.resolveUrl('http://foo.org/goo', ''), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org/goo', '.'), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org/goo/', ''), 'http://foo.org/goo/');
        assert.equal(url.resolveUrl('http://foo.org/goo/', '.'), 'http://foo.org/goo/');
        assert.equal(url.resolveUrl('http://foo.org/goo//', ''), 'http://foo.org/goo//');
        assert.equal(url.resolveUrl('http://foo.org/goo//', '.'), 'http://foo.org/goo/');
        assert.equal(url.resolveUrl('http://foo.org', ''), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org', '.'), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org/', ''), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org/', '.'), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org//', ''), 'http://foo.org//');
        assert.equal(url.resolveUrl('http://foo.org//', '.'), 'http://foo.org/');
        assert.equal(url.resolveUrl('//www.example.com', ''), '//www.example.com');
        assert.equal(url.resolveUrl('//www.example.com', '.'), '//www.example.com/');

        assert.equal(url.resolveUrl('http://foo.org/goo', 'hoo'), 'http://foo.org/hoo');
        assert.equal(url.resolveUrl('http://foo.org/goo/', 'hoo'), 'http://foo.org/goo/hoo');
        assert.equal(url.resolveUrl('http://foo.org/goo//', 'hoo'), 'http://foo.org/goo//hoo');
        assert.equal(url.resolveUrl('http://foo.org/goo', 'hoo/'), 'http://foo.org/hoo/');
        assert.equal(url.resolveUrl('http://foo.org/goo', 'hoo//'), 'http://foo.org/hoo//');
        assert.equal(url.resolveUrl('http://foo.org/goo/', '/hoo'), 'http://foo.org/hoo');
        assert.equal(url.resolveUrl('http://foo.org/goo//', '//hoo'), 'http://hoo/');

        assert.equal(url.resolveUrl('http://foo.org/goo', '..'), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org/goo', '../goo'), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org/goo/goo', '../hoo'), 'http://foo.org/hoo');

        assert.equal(url.resolveUrl('http://foo.org/goo', '.'), 'http://foo.org/');
        assert.equal(url.resolveUrl('http://foo.org/goo', './goo'), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org/goo/goo', './hoo'), 'http://foo.org/goo/hoo');

        assert.equal(url.resolveUrl('http://foo.org/goo', 'http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('http://foo.org/goo', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.resolveUrl('http://foo.org', 'goo'), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org/', 'goo'), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org//', 'goo'), 'http://foo.org//goo');
        assert.equal(url.resolveUrl('http://foo.org', '/goo'), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org/', '/goo'), 'http://foo.org/goo');
        assert.equal(url.resolveUrl('http://foo.org//', '/goo'), 'http://foo.org/goo');

        assert.equal(url.resolveUrl('http://', '//www.example.com'), 'http://www.example.com/');
        assert.equal(url.resolveUrl('file:///', '///www.example.com'), 'file:///www.example.com');
        assert.equal(url.resolveUrl('http://', 'ftp://example.com'), 'ftp://example.com/');

        assert.equal(url.resolveUrl('http://www.example.com', '//foo.org/bar'), 'http://foo.org/bar');
        assert.equal(url.resolveUrl('//www.example.com', '//foo.org/bar'), '//foo.org/bar');
        assert.equal(url.resolveUrl('E:\\foo\\goo', 'hoo?a=1'), 'e:/foo/hoo?a=1');
    }

    export function relativeUrlTest() {
        assert.equal(url.relativeUrl('foo', ''), '.');
        assert.equal(url.relativeUrl('foo', '.'), '.');
        assert.equal(url.relativeUrl('foo', '..'), '..');
        assert.equal(url.relativeUrl('foo', 'foo2'), 'foo2');
        assert.equal(url.relativeUrl('foo', 'foo/goo'), 'foo/goo');
        assert.equal(url.relativeUrl('foo', 'foo/goo?hoo=1'), 'foo/goo?hoo=1');
        assert.equal(url.relativeUrl('foo', '../foo/goo'), '../foo/goo');
        assert.equal(url.relativeUrl('foo', '/foo2'), '/foo2');
        assert.equal(url.relativeUrl('foo', 'http://the'), 'http://the/');

        assert.equal(url.relativeUrl('foo/', ''), '../');
        assert.equal(url.relativeUrl('foo/', '.'), '../');
        assert.equal(url.relativeUrl('foo/', '..'), '../..');
        assert.equal(url.relativeUrl('foo/', 'foo2'), '../foo2');
        assert.equal(url.relativeUrl('foo/', 'foo/goo'), 'goo');
        assert.equal(url.relativeUrl('foo/', 'foo/goo?hoo=1'), 'goo?hoo=1');
        assert.equal(url.relativeUrl('foo/', '../foo/goo'), '../../foo/goo');
        assert.equal(url.relativeUrl('foo/', '/foo2'), '/foo2');
        assert.equal(url.relativeUrl('foo/', 'http://the'), 'http://the/');

        assert.equal(url.relativeUrl('/the/root', '/the/root/one.js'), 'root/one.js');
        assert.equal(url.relativeUrl('/the/root/', '/the/root/'), '');
        assert.equal(url.relativeUrl('http://the', 'http://the'), '');
        assert.equal(url.relativeUrl('http://the', 'http://the/foo'), 'foo');
        assert.equal(url.relativeUrl('http://the/foo', 'http://the'), '.');
        assert.equal(url.relativeUrl('http://the/', 'http://the/'), '');
        assert.equal(url.relativeUrl('http://the/root/', 'http://the/root/one.js'), 'one.js');
        assert.equal(url.relativeUrl('/the/root', '/the/rootone.js'), 'rootone.js');
        assert.equal(url.relativeUrl('http://the/root/', 'http://the/rootone.js'), '../rootone.js');
        assert.equal(url.relativeUrl('/the/root', '/therootone.js'), '../therootone.js');
        assert.equal(url.relativeUrl('http://the/root', '/therootone.js'), '/therootone.js');

        assert.equal(url.relativeUrl('', '/the/root/one.js'), '/the/root/one.js');
        assert.equal(url.relativeUrl('.', '/the/root/one.js'), '/the/root/one.js');
        assert.equal(url.relativeUrl('', 'the/root/one.js'), 'the/root/one.js');
        assert.equal(url.relativeUrl('.', 'the/root/one.js'), 'the/root/one.js');

        assert.equal(url.relativeUrl('foo2', 'foo'), 'foo');
        assert.equal(url.relativeUrl('/', '/'), '');

        assert.equal(url.relativeUrl('/', '/the/root/one.js'), 'the/root/one.js');
        assert.equal(url.relativeUrl('/', 'the/root/one.js'), 'the/root/one.js');
        assert.equal(url.relativeUrl('http://the', 'http://foo'), '//foo/');
        assert.equal(url.relativeUrl('foo', 'data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');

        assert.equal(url.relativeUrl('http://a/a.jpg', 'http://b/a.jpg'), '//b/a.jpg');
        assert.equal(url.relativeUrl('http://a/a.jpg', 'http:b/a.jpg'), 'http:b/a.jpg');
        assert.equal(url.relativeUrl('my-procoal://a/a.jpg', 'my-procoal:/b/a.jpg'), 'my-procoal:/b/a.jpg');
        assert.equal(url.relativeUrl('http:a/a.jpg', 'http://b/a.jpg'), '//b/a.jpg');
        
        assert.equal(url.relativeUrl('http://example.com/dir/to/path.js', 'http://example.com/root/foo.js'), '../../root/foo.js');
    }

    export function normalizeUrlTest() {
        assert.equal(url.normalizeUrl(''), '');
        assert.equal(url.normalizeUrl('foo'), 'foo');
        assert.equal(url.normalizeUrl('foo/goo'), 'foo/goo');
        assert.equal(url.normalizeUrl('foo/goo/hoo'), 'foo/goo/hoo');
        assert.equal(url.normalizeUrl('//foo/goo/hoo'), '//foo/goo/hoo');
        assert.equal(url.normalizeUrl('//foo/./hoo'), '//foo/hoo');
        assert.equal(url.normalizeUrl('//foo/../hoo'), '//foo/hoo');
        assert.equal(url.normalizeUrl('//foo/../hoo/'), '//foo/hoo/');
        assert.equal(url.normalizeUrl('/foo/../hoo/'), '/hoo/');
        assert.equal(url.normalizeUrl('/foo/../hoo'), '/hoo');
        assert.equal(url.normalizeUrl('javascript:alert(0),alert(1)'), 'javascript:alert(0),alert(1)');
        assert.equal(url.normalizeUrl('my-protocal:alert(0),alert(1)'), 'my-protocal:alert(0),alert(1)');

        assert.equal(url.normalizeUrl('/..'), '/');
        assert.equal(url.normalizeUrl('/../'), '/');
        assert.equal(url.normalizeUrl('/../../../..'), '/');
        assert.equal(url.normalizeUrl('/../../../../foo/goo/hoo'), '/foo/goo/hoo');
        assert.equal(url.normalizeUrl('/foo/goo/hoo/../../../d/../../e'), '/e');

        assert.equal(url.normalizeUrl('..'), '..');
        assert.equal(url.normalizeUrl('../'), '../');
        assert.equal(url.normalizeUrl('../../foo/'), '../../foo/');
        assert.equal(url.normalizeUrl('foo/..'), '.');
        assert.equal(url.normalizeUrl('foo/../../..'), '../..');

        assert.equal(url.normalizeUrl('/.'), '/');
        assert.equal(url.normalizeUrl('/./'), '/');
        assert.equal(url.normalizeUrl('/./././.'), '/');
        assert.equal(url.normalizeUrl('/././././foo/goo/hoo'), '/foo/goo/hoo');
        assert.equal(url.normalizeUrl('/foo/goo/hoo/./././d/././e'), '/foo/goo/hoo/d/e');

        assert.equal(url.normalizeUrl(''), '');
        assert.equal(url.normalizeUrl('.'), '.');
        assert.equal(url.normalizeUrl('./'), './');
        assert.equal(url.normalizeUrl('././foo'), 'foo');
        assert.equal(url.normalizeUrl('foo/./'), 'foo/');
        assert.equal(url.normalizeUrl('foo/././.'), 'foo');

        assert.equal(url.normalizeUrl('/foo/goo//hoo////d/////'), '/foo/goo/hoo/d/');
        assert.equal(url.normalizeUrl('///foo/goo//hoo////d/////'), '///foo/goo/hoo/d/');
        assert.equal(url.normalizeUrl('foo/goo//hoo////d'), 'foo/goo/hoo/d');

        assert.equal(url.normalizeUrl('.///.././../foo/goo//./..'), '../../foo')

        assert.equal(url.normalizeUrl('my-procoal://www.example.com'), 'my-procoal://www.example.com');
        assert.equal(url.normalizeUrl('my-procoal:/www.example.com'), 'my-procoal:/www.example.com');
        assert.equal(url.normalizeUrl('http://www.example.com'), 'http://www.example.com/');
        assert.equal(url.normalizeUrl('http://www.example.com/path?foo=1'), 'http://www.example.com/path?foo=1');
        assert.equal(url.normalizeUrl('http://www.example.com/'), 'http://www.example.com/');
        assert.equal(url.normalizeUrl('http://www.example.com/./..//foo/goo/hoo/.././d//'), 'http://www.example.com/foo/goo/d/');
        assert.equal(url.normalizeUrl('data:text/javascript;base64,foo,bar'), 'data:text/javascript;base64,foo,bar');
    }

    export function isAbsoluteUrlTest() {
        assert.equal(url.isAbsoluteUrl('/'), true);
        assert.equal(url.isAbsoluteUrl('//'), true);
        assert.equal(url.isAbsoluteUrl('//server'), true);
        assert.equal(url.isAbsoluteUrl('//server/file'), true);
        assert.equal(url.isAbsoluteUrl('\\\\server\\file'), false);
        assert.equal(url.isAbsoluteUrl('\\\\server'), false);
        assert.equal(url.isAbsoluteUrl('\\\\'), false);
        assert.equal(url.isAbsoluteUrl('foo'), false);
        assert.equal(url.isAbsoluteUrl('foo:'), true);
        assert.equal(url.isAbsoluteUrl('foo:\\'), true);
        assert.equal(url.isAbsoluteUrl('foo:/'), true);
        assert.equal(url.isAbsoluteUrl('foo://'), true);
        assert.equal(url.isAbsoluteUrl('foo:/Users/'), true);
        assert.equal(url.isAbsoluteUrl('foo:\\Users\\'), true);
        assert.equal(url.isAbsoluteUrl('directory/directory'), false);
        assert.equal(url.isAbsoluteUrl('directory\\directory'), false);
        assert.equal(url.isAbsoluteUrl('/home/foo'), true);
        assert.equal(url.isAbsoluteUrl('/home/foo/..'), true);
        assert.equal(url.isAbsoluteUrl('bar/'), false);
        assert.equal(url.isAbsoluteUrl('./baz'), false);
        assert.equal(url.isAbsoluteUrl('http://xuld.net/'), true);
        assert.equal(url.isAbsoluteUrl('mailto:work@xuld.net'), true);
    }

}
