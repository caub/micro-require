const req = require('./require.js');
req.setRoot('./src');
console.log(req('./'));

console.time('native-react');
require('react');
console.timeEnd('native-react');
console.time('native-vdom');
require('virtual-dom');
console.timeEnd('native-vdom');

console.log(req('fs') === require('fs'));
