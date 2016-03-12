indicateLoaded(__dirname);

console.assert(require('./ahoy-dep') === require('./ahoy-dep.json'));

console.log(require('./ahoy-dep'));

console.assert(require('..') === exports);

require('./devil2');