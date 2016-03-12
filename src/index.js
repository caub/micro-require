var global = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : this);

global.indicateLoaded = function (file) {
	console.log(`Module "${file}" was loaded at ${Date()}`);
};

require('./level1/level2/dumdum.js');

require('./devil1');