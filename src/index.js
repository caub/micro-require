var global = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : this);

global.indicateLoaded = function (file) {
	console.log(`Module "${file}" was loaded at ${Date()}`);
};

require('./level1/level2/dumdum.js');

require('./devil1');

console.time('react require');
require('react');
console.timeEnd('react require'); // averages ~1.7s on chrome, ~2.5s on FF

/*console.time('dupe react require');
require('react');
console.timeEnd('dupe react require'); // instant, as it should be

console.time('vdom');
require('virtual-dom');
console.timeEnd('vdom'); // averages ~0.6s on chrome, ~0.9s on FF
*/

console.log(require('react').renderToString(require('./devil1/foo.jsx')));
