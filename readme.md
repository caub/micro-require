## micro-require

this is an isomorphic commonjs implementation. it uses synchronous XHR in the browser, and `readFileSync` in node. it is only for development.
it supports loading from node modules.

in the browser, loading heavily distributed node modules like react and virtual-dom etc. could take a lot of time (specially in FireFox), so better to require their dist files instead.

take a look at the `tests` folder and `index.html` to see how to set roots and add hooks etc.

I use it as a lazily-loaded browserify, giving me a workflow with 0 build time lag. It obviously won't scale well for large and hefty projects.

FF dev edition and Chrome Dev edition already support like most of the ES6, so I don't need any build at all in dev.

### how it works

the flow of things along with caching is documented here for future me and anyone interested.

there is one internal main function called `realRequire`

`realRequire` is passed two things:

- path of the directory where the calling module resides (`__dirname` of the calling module)
- the exact string literal which the caller required as module identifier

`realRequire` uses an internal operation `requirablePaths`, which passed the above two things verbatim, returns an iterator.
the iterator is a lazy sequence of paths which we will try accessing until a valid module is found.

if `./foo` was requested from `/bar/`, the following paths are traversed:

```
/bar/foo
/bar/foo.js
/bar/foo.json
/bar/foo/index.js
/bar/foo/index.json
```
if those fail, then `/bar/foo/package.json` is requested and parsed to json, and the `main` field is extracted. then `/bar/foo/${main}` is requested

if that fails as well, `node_modules` are traversed from each directory going up the tree with the same resolution algorithm above followed with single depth.

the internal `fetchSource` operation is passed the above paths in sequence, and it tries to get the content from that location relative to the `_root` internal variable (overridable by `require.setRoot` function on the main `require` instance).
