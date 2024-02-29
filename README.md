# bedrock-webpack

A [bedrock][] module that provides capability to combine and minify web client
resources using [webpack][].

**bedrock-webpack** autogenerates and runs a [webpack][] configuration that
will combine and minimize input resources into a single output resource.

**bedrock-webpack** is often coupled with [bedrock-views][] and
[bedrock-vue][] to provide frontend UIs. It adds webpack specific commands
for development and to the [bedrock-views][] optimize command.

## Requirements

- npm v6+

## Quick Examples

In your main app, install the module and load it.

```
npm install --save @bedrock/webpack
```

```js
import '@bedrock/webpack';
```

Now the [bedrock-views][] `optimize` command will run the webpack optimization.

## Defines

A [bedrock][] command line option is available to allow defining build time
constants with the [webpack][] [DefinePlugin][].

- Use `--webpack-define NAME=VALUE`. This can be used multiple times.
- Check the name exists for optional constants.
- The value is always a string.
- These defines take precedence over other [bedrock][] defines. For instance,
  you can override `process.env.NODE_ENV` with this option.

```sh
node app.js --webpack-define MY_BOOL=true --wepack-define MY_JSON=false
```
```js
if(typeof MY_BOOL !== 'undefined' && MY_BOOL === 'true') {
  const value = MY_BOOL;
  // ...
}
if(typeof MY_JSON !== 'undefined') {
  const value = JSON.parse(MY_JSON);
  // ...
}
```

## License

[Apache License, Version 2.0](LICENSE) Copyright 2017-2024 Digital Bazaar, Inc.

Other Bedrock libraries are available under a non-commercial license for uses
such as self-study, research, personal projects, or for evaluation purposes.
See the
[Bedrock Non-Commercial License v1.0](https://github.com/digitalbazaar/bedrock/blob/main/LICENSES/LicenseRef-Bedrock-NC-1.0.txt)
for details.

Commercial licensing and support are available by contacting
[Digital Bazaar](https://digitalbazaar.com/) <support@digitalbazaar.com>.

[DefinePlugin]: https://webpack.js.org/plugins/define-plugin/
[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-vue]: https://github.com/digitalbazaar/bedrock-vue
[bedrock-views]: https://github.com/digitalbazaar/bedrock-views
[webpack]: https://webpack.js.org/
