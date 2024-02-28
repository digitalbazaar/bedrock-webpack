/*!
 * Copyright 2017 - 2024 Digital Bazaar, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import * as bedrock from '@bedrock/core';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const cc = bedrock.util.config.main.computer();
const {config} = bedrock;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
