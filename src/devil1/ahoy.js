indicateLoaded(__filename);

console.assert(require('./ahoy-dep.json') === require('./ahoy-dep.json'));

console.log(require('./ahoy-dep.json'));

console.assert(require('..') !== exports);

require('./devil2');
