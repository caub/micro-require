const req = require('./require.js');
req.setRoot('./src');

req.cache.react = {exports: req('./node_modules/react/dist/react.js')};

(function () {
	const babel = req('babel-standalone');
	req.hooks.jsx = function(repr) {
		repr.source.content = `const React = require('react');
		${babel.transform(repr.source.content, {presets:['react']}).code}`;
		req.hooks.js(repr);
	};
})();

console.log(req('./'));

console.log(req('fs') === require('fs'));
