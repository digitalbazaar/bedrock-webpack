# bedrock-webpack ChangeLog

## 2.1.0 - xxxxx

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
