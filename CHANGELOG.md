# bedrock-webpack ChangeLog

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
