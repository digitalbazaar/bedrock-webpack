# bedrock-webpack ChangeLog

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
