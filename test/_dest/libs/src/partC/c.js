"undefined"==typeof define&&(define=function(e,i,n){(define.modules||(define.modules={}))[e]={inited:!1,exports:{},define:n,dep:i}},require=function(e,i){var n=define.modules[e];return n&&!n.inited&&(n.inited=!0,n.define(require,n.exports,n,e)),n.exports});

define("libs/src/partC/c.js", [], function(require, exports, module){
module.exports = function () {
	alert("c.js");
};




});

require("libs/src/partC/c.js");