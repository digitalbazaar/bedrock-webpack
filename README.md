# bedrock-webpack

A [bedrock][] module that provides capability to combine and minify web client
resources using [webpack][].

**bedrock-webpack** autogenerates and runs a [webpack][] configuration that
will combine and minimize input resources into a single output resource.

**bedrock-webpack** is often coupled with [bedrock-views][] and
[bedrock-angular][] to provide frontend UIs.  It adds webpack specific commands
to the [bedrock-views][] optimize command.

## Requirements

- npm v3+

## Quick Examples

In your main app, install the module and load it.

```
npm install --save bedrock-webpack
```

```js
require('bedrock-webpack');
```

Now the [bedrock-views][] `optimize` command will run the webpack optimization.

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-angular]: https://github.com/digitalbazaar/bedrock-angular
[bedrock-views]: https://github.com/digitalbazaar/bedrock-views
[webpack]: https://webpack.js.org/
