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
