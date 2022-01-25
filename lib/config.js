/*
 * Bedrock webpack Module Configuration
 *
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const cc = bedrock.util.config.main.computer();
const config = bedrock.config;
const path = require('path');

config['bedrock-webpack'] = {};

// configs to be merged with webpack-merge into the base config
config['bedrock-webpack'].configs = [];

// default main output file location
cc('bedrock-webpack.out', () => path.join(
  config.paths.cache, 'bedrock-webpack', 'main.min.js'));

// base polyfill entry array
// default to recommended polyfills and @babel/preset-env builtin "entry"
// option.
//
// if neede, can override with specifics for a custom build
// a useful subset depends on support of target browsers
// example covering some use cases:
// [
//   // async/await
//   'regenerator-runtime/runtime'
//   // misc APIs
//   'core-js/fn/array/includes',
//   'core-js/fn/object/assign',
//   // promises
//   'core-js/fn/promise',
//   // for..of loops due to iterators
//   'core-js/fn/symbol',
// ]
cc('bedrock-webpack.polyfillEntry', () => [
  // using a file that imports recommended polyfills so @babel/preset-env can
  // perform optimizations.
  path.join(__dirname, 'polyfill.js')
]);

// babel-loader cache
cc('bedrock-webpack.babel-loader.cache', () => path.join(
  config.paths.cache, 'bedrock-webpack', 'babel-loader'));
