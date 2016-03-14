(function() {

	let _root = (typeof process !== 'undefined' && typeof process.cwd === 'function') ? process.cwd() : '/';

	const path = (function pathModule() {
		// this code was shamelessly copy-pasted from https://raw.githubusercontent.com/substack/path-browserify/master/index.js
		// license of the original location respected
		// minor edits done by "Awal Garg <awalgarg@gmail.com>"
		exports = {};
		function normalizeArray(parts, allowAboveRoot) {
			// if the path tries to go above the root, `up` ends up > 0
			var up = 0;
			for (var i = parts.length - 1; i >= 0; i--) {
				var last = parts[i];
				if (last === '.') {
					parts.splice(i, 1);
				} else if (last === '..') {
					parts.splice(i, 1);
					up++;
				} else if (up) {
					parts.splice(i, 1);
					up--;
				}
			}

			// if the path is allowed to go above the root, restore leading ..s
			if (allowAboveRoot) {
				for (; up--; up) {
					parts.unshift('..');
				}
			}

			return parts;
		}

		// Split a filename into [root, dir, basename, ext], unix version
		// 'root' is just a slash, or nothing.
		var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
		var splitPath = function(filename) {
			return splitPathRe.exec(filename).slice(1);
		};

		// path.resolve([from ...], to)
		// posix version

		exports.resolve = memoize(function() {
			var resolvedPath = '',
			resolvedAbsolute = false;

			for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
				var path = (i >= 0) ? arguments[i] : '/';

				// Skip empty and invalid entries
				if (typeof path !== 'string') {
					throw new TypeError('Arguments to path.resolve must be strings');
				} else if (!path) {
					continue;
				}

				resolvedPath = path + '/' + resolvedPath;
				resolvedAbsolute = path.charAt(0) === '/';
			}

			// At this point the path should be resolved to a full absolute path, but
			// handle relative paths to be safe (might happen when process.cwd() fails)

			// Normalize the path
			resolvedPath = normalizeArray(resolvedPath.split('/').filter(function(p) {
				return !!p;
			}), !resolvedAbsolute).join('/');

			return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
		});

		exports.extname = function(path) {
			return splitPath(path)[3];
		};

		return exports;
	})();

	const fetchSync = (function() {
		if (typeof window !== 'undefined' && 'XMLHttpRequest' in window) {
			return memoize(function() {
				let xhr = new XMLHttpRequest();
				return function(path) {
					xhr.open('GET', path, false);
					xhr.send();

					let statusCode = String(xhr.status);

					if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
						throw new Error(`Request for "${p}" failed with status "${statusCode}" (${xhr.statusText})`);
					}

					return {
						responseText: xhr.responseText,
						contentType: xhr.getResponseHeader('Content-Type'),
						responseURL: xhr.responseURL
					};
				};
			}());
		} else if (typeof require === 'function') {
			return memoize(function() {
				const fs = require('fs');
				const stdPath = require('path');
				return function(path) {
					return {
						responseText: fs.readFileSync(`./${path}`, 'utf8'), // this would always throw if file is not found IIUC
						responseURL: stdPath.resolve(path)
					};
				};
			}());
		}
	})();

	const requirablePaths = (function () {
		function* requirablePaths(from, module) {
			if (module.startsWith('./') || module.startsWith('/') || module.startsWith('../')) {
				yield* relativeRequirablePaths(from, module);
			} else {
				for (let nodeModulePath of nodeModulePaths(from)) {
					yield* relativeRequirablePaths(nodeModulePath, module, true);
				}
			}
		}
		function* relativeRequirablePaths(from, module, forceAll=false) {
			let p = path.resolve(from, module);
			let hasExt = Object.keys(hooks).some(function (key) {
				return module.endsWith(`.${key}`);
			});
			if (hasExt) {
				yield p;
			} else {
				yield `${p}.js`;
				// yield `${p}.json`;
			}
			if (forceAll) {
				yield `${p}.js`;
			}
			yield path.resolve(from, module, './index.js');
			yield path.resolve(from, module, './index.json');
			try {
				let xhr = fetchSync(path.resolve(_root, `./${path.resolve(from, module, './package.json')}`));
				let res = JSON.parse(xhr.responseText);
				if (typeof res.main !== 'string') throw new TypeError('Field "main" of package.json is not a string');
				let resolved = path.resolve(from, module, res.main);
				yield resolved;
				yield `${resolved}.js`;
			} catch (er) {}
		}
		function* nodeModulePaths(from) {
			/**
			 * say from is /foo/bar/baz
			 * then we yield the following sequence
			 * /foo/bar/baz/node_modules
			 * /foo/bar/baz/../node_modules <=> /foo/bar/node_modules
			 * /foo/bar/baz/../../node_modules <=> /foo/node_modules
			 * /foo/bar/baz/../../node_modules <=> /node_modules
			 */
			do {
				yield path.resolve(from, 'node_modules');
				from = path.resolve(from, '..');
			} while(from !== '/');
			yield '/node_modules';
		}
		return requirablePaths;
	})();

	function memoize(fn, hasher=JSON.stringify) {
		function memoized(...args) {
			const key = hasher(args);
			if (key in memoized.__cache) {
				return memoized.__cache[key];
			} else {
				let result = fn(...args);
				memoized.__cache[key] = result;
				return result;
			}
		}
		memoized.__cache = Object.create(null);
		return memoized;
	}

	const fetchSource = memoize(function fetchSource(p) {
		let xhr = fetchSync(path.resolve(_root, `./${p}`));

		let contentType = xhr.contentType, fileType, finalPath = xhr.responseURL, content = xhr.responseText;

		// try resolving fileType from contentType served by server
		if (contentType) {
			if (contentType.startsWith('application/javascript') || contentType.startsWith('text/javascript')) {
				fileType = 'js';
			}
			if (contentType.startsWith('application/json') || contentType.startsWith('text/json')) {
				fileType = 'json';
			}
			if (contentType.startsWith('text/css')) {
				fileType = 'css';
			}
		}

		// if we didn't find any match from content type, fall back to file name
		if (!fileType) {
			fileType = path.extname(p).replace(/^\s*\./, '');
		}

		// if we still didn't get it, just default to js
		if (!fileType) {
			fileType = 'js';
		}

		return {
			contentType,
			fileType,
			requestPath: p,
			finalPath,
			content
		};
	});

	let IS_STRICT_MODE = false;
	try {
		eval('with(1){}');
	} catch(er) {
		IS_STRICT_MODE = true;
	}
	const hooks = {
		js: jsModuleCompile,
		json: jsonModuleCompile,
		jsx(rep) {
			rep.source.content = compileJSXSomehowOMG(rep.source.content);
			return jsModuleCompile(rep);

			function compileJSXSomehowOMG(source) {
				console.log('hahahahaha I am unimplemented lol! tricked you! :D');
				return source;
			}
		},
		css() {},
		less() {},
		sass() {}
	};

	const cache = Object.create(null);

	const resolveModuleRequestToSource = memoize(function (from, module) {
		let paths = requirablePaths(from, module);
		let source;
		for (let path of paths) {
			try {
				source = fetchSource(path);
				break;
			} catch (er) {
				// implicit continue;
				// btw I wonder how a for loop would feel when we break out of it
				// maybe like yo mama
			}
		}
		if (!source) {
			throw new Error(`Operation HostResolveImportedModule failed to resolve module "${module}" from "${from}"!`);
		}
		return source;
	});

	if (typeof window !== 'undefined') {
		window.process = {
			cwd() { return _root; },
			on() {},
			abort() { window.stop(); },
			arch: '',
			argv: [],
			chdir(val) { _root = val; },
			config: {},
			connected: false,
			disconnect() {},
			env: {},
			execArgv: [],
			execPath: _root,
			exit() { window.close(); },
			exitCode: 0,
			getegid() { return 0; },
			geteuid() { return 0; },
			getgid() { return 0; },
			getgroups() { return []; },
			getuid() { return 0; },
			hrtime() { return Date.now(); },
			initgroups() { return []; },
			kill() {},
			mainModule: {},
			memoryUsage() { return {}; },
			nextTick(fn) { setTimeout(fn, 0); },
			pid: 0,
			platform: 'browser',
			release: {},
			send: void 0,
			setegid() {},
			seteuid() {},
			setgid() {},
			setgroups() {},
			setuid() {}
		};
	}

	function realRequire(from, module, hooks, cache) {
		if (module in cache) {
			// probably an inbuilt module mapped with magic
			return cache[module];
		}

		const source = resolveModuleRequestToSource(from, module);

		if (source.finalPath in cache) {
			return cache[source.finalPath].module;
		}

		// excuse me for a sec, I need to clear my throat
		const MODULE_OBJECT = {};

		const moduleRepresentation = cache[source.finalPath] = {
			module: MODULE_OBJECT,
			source
		};

		if (typeof hooks[source.fileType] !== 'function') {
			throw new Error(`No hook available for fileType "${source.fileType}"`);
		}
		hooks[source.fileType](moduleRepresentation);
		return MODULE_OBJECT;
	}

	function createLocalRequire(from) {
		return function localRequire(module) {
			return realRequire(from, module, hooks, cache).exports;
		};
	}

	function jsModuleCompile({module, source}) {
		const exports = {};
		module.exports = exports;
		const m__dirname = path.resolve(source.requestPath, '..');
		const modeDirective = IS_STRICT_MODE ? '"use strict";\n' : '';
		Function(
				'module', 'exports',
				'require',
				'__dirname', '__filename', 'process',
				`${modeDirective}${source.content}\n\n\/\/# sourceURL=${source.finalPath}`
			)(
				module, exports,
				createLocalRequire(m__dirname),
				m__dirname, source.requestPath, process
			);
		source.content = ''; // deallocating this large ass string
	}

	function jsonModuleCompile({module, source}) {
		module.exports = JSON.parse(source.content);
	}

	const rootRequire = createLocalRequire('/');
	Object.assign(rootRequire, {
		hooks, cache,
		setRoot(val) {
			_root = val;
		}
	});

	if (typeof process !== 'undefined' && typeof module !== 'undefined' && 'exports' in module) {
		// probably in node or another require chamber
		module.exports = rootRequire;
		rootRequire.setRoot('./');
		for (let lib of require('repl')._builtinLibs) {
			cache[lib] = {exports: require(lib)};
		}
	} else if (typeof window !== 'undefined') {
		let _previousRequire = window.require;
		window.require = rootRequire;
		window.require.noConflict = function() {
			window.require = _previousRequire;
			return rootRquire;
		};
	} else {
		throw new Error('I dunno where you are running this, but you seem to be lost');
	}

	process.nextTick(function() {
		fetchSync.__cache = {};
	});

})();
