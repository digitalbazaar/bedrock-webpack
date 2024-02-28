# bedrock-webpack ChangeLog

## 9.1.0 - 2024-02-xx

### Changed
- Relicense under the Apache-2.0 license.

## 9.0.3 - 2023-03-08

### Fixed
- Replace unmaintained `vue-style-loader` with maintained `style-loader`.

## 9.0.2 - 2023-03-08

### Fixed
- Restored `vue-style-loader` package. This package has been found to be
  functional to some extent and will need a replacement.

## 9.0.1 - 2023-02-28

### Fixed
- Removed ineffectual, duplicative, and obsolete `vue-style-loader` package.
  The `vue-loader` package already handles vue styles and the old
  `vue-style-loader` package has seen no maintenance in several years. It
  also now includes dependencies that have been flagged with vulnerabilities.
  Therefore, this patch removes it.

## 9.0.0 - 2022-08-22

### Changed
- **BREAKING**: Require peer dependency `@bedrock/views@11`.

### Removed
- **BREAKING**: Remove extra CSS optimization options. CSS is expected to
  be used through Vue 3 and the Vue compiler already handles minimization.

## 8.0.0 - 2022-05-26

### Changed
- **BREAKING**: Upgrade to Vue 3. Vue 2 is no longer supported with
  this version.

## 7.0.1 - 2022-04-29

### Fixed
- Fix command line option handling.

## 7.0.0 - 2022-04-28

### Changed
- **BREAKING**: Update peer deps:
  - `@bedrock/core@6`
  - `@bedrock/views@10`.

## 6.0.0 - 2022-04-13

### Changed
- **BREAKING**: Upgrade to `webpack@5`.
  - Custom webpack configuration may need to be adjusted.
  - Node.js polyfills are now disabled by default.
  - Assets are put into a single directory rather than `js`, `css`,
    and `images`. (This may change back in the future if possible.)
  - HTML and CSS resource paths (such as images) may need to be
    relative to the source files rather than absolute. The tools can
    then copy resources and adjust paths as needed in the output.
- **BREAKING**: Remove support for IE11.
- Upgrade other dependencies.
- Improved some webpack error logging.

### Removed
- `bedrock-webpack.terser.config` setting.
- babel plugins are now handled by `@babel/preset-env`:
  - `@babel/plugin-syntax-dynamic-import`
  - `@babel/plugin-proposal-object-rest-spread`

## 5.0.3 - 2022-04-09

### Fixed
- Fix `NODE_MODULES_DIR` constant based on new package location.

## 5.0.2 - 2022-04-09

### Fixed
- Fix `require.resolve` usage.

## 5.0.1 - 2022-04-09

### Fixed
- Fix vue-loader plugin import.

## 5.0.0 - 2022-04-05

### Changed
- **BREAKING**: Rename package to `@bedrock/webpack`.
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Remove default export.
- **BREAKING**: Require node 14.x.

## 4.2.0 - 2022-03-30

### Changed
- Change sass-loader engine from `node-sass` to `sass` to
  remove native module and use pure JS + modern and supported
  sass engine based on dart sass.

## 4.1.0 - 2022-03-30

### Changed
- Update peer deps:
  - `bedrock@4.5`
  - `bedrock-views@8.1`.
- Update internals to use esm style and use `esm.js` to
  transpile to CommonJS.

## 4.0.1 - 2022-03-16

### Fixed
- Fix dependencies:
  - Make `html-webpack-plugin@4` a regular dependency.

## 4.0.0 - 2022-03-16

### Added
- Add `html-webpack-plugin@4` as a development dependency.
- Add `templates/index.html` to serve as the base html template for all
  bedrock web applications.

### Changed
- **BREAKING**: Change filenames to include hash. They now are of the form
  `[name].[hash].extension`.
- **BREAKING**: Update peer deps:
  - `bedrock@4.4.3`
  - `bedrock-views@8`.
- **BREAKING**: Require node 12.

### Removed
- **BREAKING**: Removed `size` and `output` from information logging after
  successful webpack builds.

## 3.6.0 - 2021-01-29

### Changed
- Use `node-sass@5` which includes pre-built binaries for Alpine. This
  elimnates the build step during deployment.

## 3.5.0 - 2021-01-21

### Changed
- Turn off vue-loader prettify mode during production builds. This will suppress
  errors when prettify was not installed in a `--no-optional` installation.

## 3.4.0 - 2020-03-24

### Added
- Command line options `--webpack-define NAME=VALUE` to define frontend data.
  In general, the frontend should use a pattern like the following:

```sh
node app.js --webpack-define MY_BOOL=true --wepack-define MY_JSON=false
```
```js
if(typeof MY_BOOL !== 'undefined' && MY_BOOL === 'true') {
  // ...
}
if(typeof MY_JSON !== 'undefined') {
  config.json = JSON.parse(MY_JSON);
}
```

## 3.3.0 - 2020-03-18

### Changed
- Only define `process.env.NODE_ENV` when `--webpack-mode production` is used.
  Allows use of frontend production only code.

## 3.2.0 - 2020-02-13

### Fixed
- Add root `node_modules` path last to modules search path to fix issue with
  symlinked modules.

## 3.1.0 - 2020-01-24

### Fixed
- Adjust webpack path processing so the root file is found early and regular
  `node_modules` processing takes default priority over the root
  `node_modules`. This helps avoid the issue of using the top-level version of
  a package when a local specific version should be used. Note that there still
  remains a potential similar issue of choosing the wrong version when using
  webpack config overrides. This is a specialized use case and will be
  addressed at a later time if needed.

### Changed
- Update dependencies.

## 3.0.2 - 2019-12-19

### Fixed
- Wrap and adjust HMR middleware to avoid disruption of proper session
  operation.

## 3.0.1 - 2019-11-12

### Changed
- Update dependencies.

### Added
- Add vue-template-compiler dependency.

## 3.0.0 - 2019-11-08

### Notes

- **BREAKING**: This is a major release. **Upgrading is required.** Read the
  changes below and those in `bedrock-views`.

### Fixed
- `--webpack-uglify-beautify` was setting incorrect flag.

### Changed
- Switched from async library to async/await.
- Use "watch" support by default for development.
- Use webpack "development" mode for built files.
- By default disable Babel during developmemt and enable during production.
- Enable Babel cache.
- **BREAKING**: Remove `bedrock-webpack.baseEntry` option in favor of a
  `bedrock-webpack.polyfillEntry` option. The default is to load a file that
  imports `@core-js/stable` and `regenerator-runtime/runtime` and uses the
  `entry` builtin mode of `@babel/preset-env`.
- **BREAKING**: Require Node.js >= 10.10. (Used for modern fs.promises and
  newer fs APIs).
- Switched from UglifyJS to Terser for JS minification.
- **BREAKING**: Changed around various minification option names. Check
  `--help`.
- Use core-js@3.

### Added
- eslint support.
- `--webpack-uglify-comments <true|false>` to omit all comments.
- `--webpack-mode <development|production>` to set webpack mode.
- `--webpack-stats <true|false>` to output stats.
- `--webpack-log-config <true|false>` to output webpack config.
- `--webpack-babel <true|false|mode>` to set babel mode.
- `--webpack-babel-debug <true|false>` to set babel debug mode.
- `--webpack-progress <true|false>` to show webpack progress.
- `--webpack-symlink-watch` option that, by default, will scan `node_modules`
  for symlinks and add webpack aliases so they work in watch mode. This is a
  limitation of the current webpack and will be removed once upstream
  supports symlink style development. This feature currently only scans the
  top-level of packages for symlinks.
- Initial "watch" support.
  - Used to rebuild optimized output as source files change.
  - Explicitly enabled with: `--minify true --watch true`.
  - Hot Module Replacement (HRM) support.
- `clean-webpack-plugin` support.
- CSS extraction support. Only enabled with CLI option due to a bug related
  to static imports.
- CSS optimization support.
- Handle image and font files.
- Clean build directory support.

### Removed
- **BREAKING**: AngularJS support.

## 2.1.1 - 2019-02-07

### Fixed
- Fix path resolution for CSS preprocessors.

## 2.1.0 - 2019-02-07

### Added
- Support scss, sass, less, and stylus for css preprocessing.

## 2.0.0 - 2018-08-06

### Added
- `baseEntry` config property to override the default `babel-polyfill`.
- Support Vue SFCs.
- Support bundle chunking/dynamic imports.

### Changed
- **BREAKING**: Use webpack 4.x.

## 1.2.2 - 2018-03-20

### Fixed
- Remove peer dependency for bedrock-docs.

## 1.2.1 - 2018-03-20

### Fixed
- Remove unnecessary dependency on bedrock-docs.
- Exclude common `localForage` lib from babel processing.

## 1.2.0 - 2017-11-14

### Added
- Use `babel-plugin-transform-object-rest-spread`.

### Changed
- Use `require.resolve` to get paths for webpack resources so they work when
  installed and in linked mode.

## 1.1.3 - 2017-08-23

### Changed
- Update dependencies.

### Fixed
- Too tight.

## 1.1.2 - 2017-08-21

### Fixed
- Tighten babel excludes.

## 1.1.1 - 2017-08-17

### Fixed
- Symlinked modules are properly processed by webpack.

## 1.1.0 - 2017-07-24

### Changed
- Use child logger.

### Added
- Add status and profile options.

## 1.0.2 - 2017-06-29

### Fixed
- Event name typo.

## 1.0.1 - 2017-06-29

### Fixed
- Update dependency.

## 1.0.0 - 2017-06-29

### Added
- Initial version of webpack support for Bedrock.
