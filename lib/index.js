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
import appRoot from 'app-root-path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import webpack from 'webpack';
import {merge as webpackMerge} from 'webpack-merge';

// webpack plugins
import {CleanWebpackPlugin} from 'clean-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import StatsPlugin from 'stats-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import {VueLoaderPlugin} from 'vue-loader';

const {config, util: {BedrockError}} = bedrock;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// load config defaults
import './config.js';

const logger = bedrock.loggers.get('app').child('bedrock-webpack');
const NODE_MODULES_DIR = path.resolve(__dirname, '../../../../node_modules');

function collectHmrPaths(value, previous) {
  return previous.concat(value);
}

function collectDefines(value, previous) {
  return previous.concat([value.split('=')]);
}

// webpack options always available
bedrock.events.on('bedrock-cli.init', () => {
  bedrock.program
    // main mode
    .option('--webpack-mode <mode>',
      'Use webpack mode' +
      ' (development, production, default).',
      /^(development|production|default)$/i, 'default')

    // babel
    .option('--webpack-babel <mode>',
      'Use babel, force use or base on mode' +
      ' (true, false, mode).',
      /^(true|false|mode)$/i, 'mode')
    .option('--webpack-babel-debug <mode>',
      'Enable babel debug' +
      ' (true, false).',
      /^(true|false)$/i, 'false')

    // JS options
    .option('--webpack-optimize-js <mode>',
      'Optimize JS' +
      ' (true, false, mode).',
      /^(true|false|mode)$/i, 'true')
    .option('--webpack-js-mangle <mode>',
      'Mangle optimized JS' +
      ' (true, false, default).',
      /^(true|false)$/i, 'true')
    .option('--webpack-js-beautify <default>',
      'Beautify optimized JS' +
      ' (true, false, default).',
      /^(true|false)$/i, 'false')
    .option('--webpack-js-comments <mode>',
      'Keep comments in optimized JS' +
      ' (true, all, some, false, default).',
      /^(true|all|some|false|)$/i, 'false')

    // progress
    .option('--webpack-progress <mode>',
      'Show progress' +
      ' (true, false).',
      /^(true|false)$/i, 'false')

    // stats
    .option('--webpack-profile <mode>',
      'Profile build' +
      ' (true, false).',
      /^(true|false)$/i, 'false')
    .option('--webpack-stats <mode>',
      'Generate stats' +
      ' (true, false).',
      /^(true|false)$/i, 'false')

    // Hot module reload
    .option('--webpack-hmr <mode>',
      'Use hot-module-reload (HMR) in development mode' +
      ' (true, false).',
      /^(true|false)$/i, 'true')
    .option('--webpack-hmr-paths <mode>',
      'Mode used to scan for symlinked dependencies to consider "unmanaged"' +
      ' where changes will trigger hot-module-reload (HMR) updates.' +
      ' (none, top, all).',
      /^(none|top|all)$/i, 'top')
    .option('--webpack-hmr-path <fullpath>',
      'Path to consider "unmanaged" where changes will trigger' +
      ' hot-module-reload (HMR) updates. (repeatable)',
      collectHmrPaths, [])

    // clean
    // TODO: 'dry' option?
    .option('--webpack-clean <mode>',
      'Clean build directory' +
      ' (true, false).',
      /^(true|false)$/i, 'true')
    .option('--webpack-clean-verbose <mode>',
      'Clean build directory verbosely' +
      ' (true, false).',
      /^(true|false)$/i, 'false')

    // misc
    .option('--webpack-define <name=value>',
      'Define a frontend build time constant. (repeatable)',
      collectDefines, [])

    // debug
    .option('--webpack-log-config <mode>',
      'Log webpack config' +
      ' (true, false).',
      /^(true|false)$/i, 'false');
});

bedrock.events.on('bedrock-views.bundle.run', async options => {
  const output = options.output || config['bedrock-webpack'].out;
  const paths = options.paths || config['bedrock-webpack'].paths;

  // config to setup path to root file
  const rootConfig = {
    resolve: {
      modules: [
        // FIXME: this should be a param
        // FIXME: improve this
        path.dirname(bedrock.config.views.bundle.paths.input.root),
      ]
    }
  };

  const overrideConfigs = await _buildOverrideConfigs(options);

  await bundle({
    main: options.input,
    output,
    paths,
    configs: [
      rootConfig,
      ...overrideConfigs,
    ],
    optimize: options.optimize,
    watch: options.watch
  });
});

/**
 * Bundle the main entry points using webpack into a single file.
 *
 * @param {object} [options] - The options to use:
 *   [main] a string or array of entry points
 *   [output] filename to output
 *   [paths] paths for output (local and public)
 *   [configs] an array of webpack configs to merge
 *   [optimize] true to optimize
 *   [watch] true to watch for changes.
 *
 * @returns {Promise} Promise that resolves when bundling is complete.
 */
export async function bundle(options = {}) {
  if(!('main' in options)) {
    throw new BedrockError(
      'webpack optimize missing main entry point',
      'WebpackError');
  }

  options.configs = options.configs || [];
  const paths = Object.assign({
    local: path.dirname(options.output),
    public: '/'
  }, options.paths || {});

  // FIXME: if optimize has specific options, need cli command
  //const command = bedrock.config.cli.command.opts();
  const command = bedrock.program.opts();

  // webpack mode
  let webpackMode;
  if(command.webpackMode === 'development') {
    webpackMode = 'development';
  } else if(command.webpackMode === 'production') {
    webpackMode = 'production';
  } else { // 'default'
    webpackMode = options.optimize ? 'production' : 'development';
  }

  // production mode
  const isProduction = webpackMode === 'production';

  // babel mode
  let webpackBabel;
  if(command.webpackBabel === 'true') {
    webpackBabel = true;
  } else if(command.webpackBabel === 'false') {
    webpackBabel = false;
  } else { // 'mode'
    webpackBabel = (webpackMode === 'production');
  }

  // progress mode
  const webpackProgressPlugin = [];
  if(command.webpackProgress === 'true') {
    webpackProgressPlugin.push(new webpack.ProgressPlugin());
  }

  // hot-module-reload mode
  const hmr = !isProduction && command.webpackHmr === 'true';
  const webpackHmrPlugin = [];
  const webpackHmrEntry = [];
  if(hmr) {
    webpackHmrPlugin.push(new webpack.HotModuleReplacementPlugin());
    webpackHmrEntry.push('webpack-hot-middleware/client');
  }

  const webpackDefinePlugin = [];
  const defines = {
    // FIXME: are these needed?
    'process.env.DEBUG': '"false"',
    'process.env.BUILD': '"web"'
  };
  if(isProduction) {
    // FIXME: are other modes needed?
    defines['process.env.NODE_ENV'] = '"production"';
  }
  // use CLI defines and override existing defines
  for(const [name, value] of command.webpackDefine) {
    defines[name] = JSON.stringify(value || '');
  }
  webpackDefinePlugin.push(new webpack.DefinePlugin(defines));

  // clean mode
  const webpackCleanPlugin = [];
  if(command.webpackClean === 'true') {
    const opts = {
      verbose: command.webpackCleanVerbose === 'true'
    };
    webpackCleanPlugin.push(new CleanWebpackPlugin(opts));
  }

  // html webpack plugin
  const webpackHtmlPlugin = [];
  webpackHtmlPlugin.push(new HtmlWebpackPlugin({
    template: path.join(__dirname, '..', 'templates', 'index.html')
  }));
  // set entry
  const entry = [
    ...config['bedrock-webpack'].polyfillEntry,
    ...webpackHmrEntry,
    ...options.main
  ];

  logger.info('bundling', {
    entry,
    output: options.output,
    mode: webpackMode
  });

  const baseConfig = {
    context: appRoot.toString(),
    mode: webpackMode,
    entry: {
      main: entry
    },
    output: {
      path: path.join(paths.local, 'js'),
      publicPath: path.join(paths.public, 'js/'),
      filename: '[name].[hash].js'
    },
    resolve: {
      alias: {
        // often will need an alias in each projects config like:
        // 'my-project': path.resolve(__dirname, '../components')
        //vue: require.resolve('@vue/compat')
        vue: require.resolve('vue')
      }
    },
    module: {
      rules: [
        {
          test: {
            and: [
              /\.js$/,
              () => webpackBabel
            ]
          },
          // common modules to exclude from processing
          // FIXME: find a better way than hand selecting these
          exclude: [
            /node_modules\/jsonld\/dist\//,
            /node_modules\/localforage\//,
            /node_modules\/lodash\//,
            /node_modules\/quasar\/dist\//
          ],
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              cacheDirectory: config['bedrock-webpack']['babel-loader'].cache,
              presets: [
                // normal mode
                [
                  require.resolve('@babel/preset-env'),
                  {
                    useBuiltIns: 'entry',
                    corejs: '3.21',
                    bugfixes: true,
                    debug: command.webpackBabelDebug === 'true',
                    targets: ['defaults', 'not IE 11'],
                  }
                ]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            require.resolve('style-loader'),
            require.resolve('css-loader')
          ]
        },
        {
          test: /\.less$/,
          use: [
            require.resolve('style-loader'),
            require.resolve('css-loader'),
            require.resolve('less-loader')
          ]
        },
        {
          test: /\.scss$/,
          use: [
            require.resolve('style-loader'),
            require.resolve('css-loader'),
            {
              loader: require.resolve('sass-loader'),
              options: {
                api: 'modern'
              }
            }
          ]
        },
        {
          test: /\.styl(us)?$/,
          use: [
            require.resolve('style-loader'),
            require.resolve('css-loader'),
            require.resolve('stylus-loader')
          ]
        },
        /*
        {
          test: /\.(css|less|scss|styl(us)?)$/,
          use: [
            'css-loader'
          ]
        },
        */
        {
          test: /\.vue$/,
          loader: require.resolve('vue-loader'),
          options: {
            hotReload: hmr,
            prettify: !isProduction
          }
        },
        /*
        // FIXME: fix or remove due to webpack v5 path issues
        {
          test: /\.(woff|woff2|eot|ttf|otf|svg)$/,
          issuer: /\.(css|less|scss|styl(us)?)$/,
          use: [{
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: '../css'
            }
          }]
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          issuer: s => {
            const r = /\.(css|less|scss|styl(us)?)$/;
            return !r.test(s);
          },
          use: [{
            loader: 'file-loader',
            options: {
              name: '[name].[ext]',
              outputPath: '../images'
            }
          }]
        }
        */
      ]
    },
    plugins: [
      ...webpackHtmlPlugin,
      ...webpackDefinePlugin,
      ...webpackCleanPlugin,
      new VueLoaderPlugin(),
      ...webpackProgressPlugin,
      ...webpackHmrPlugin
    ],
    profile: command.webpackProfile === 'true'
  };

  const hmrPathsConfig = {};
  if(hmr) {
    hmrPathsConfig.snapshot = {
      // add command option paths
      unmanagedPaths: command.webpackHmrPath
    };

    // find symlinks to consider 'unmanaged' for snapshots and HMR
    async function hmrScan({
      root, depth, maxDepth
    }) {
      // find root dir symlinks and add as unmanaged
      // check if path exists
      try {
        await fs.promises.access(root, fs.constants.R_OK);
      } catch(e) {
        return;
      }
      // check current level
      const dirents = await fs.promises.readdir(root, {withFileTypes: true});
      for(const dirent of dirents) {
        // skip bin dir
        if(dirent.name === '.bin') {
          continue;
        }
        const entpath = path.join(root, dirent.name);
        if(dirent.isSymbolicLink()) {
          hmrPathsConfig.snapshot.unmanagedPaths.push(entpath);
          continue;
        }
        // if a scope, scan scope dir same as top level
        if(dirent.name.startsWith('@')) {
          await hmrScan({
            root: entpath,
            depth,
            maxDepth
          });
          continue;
        }
        // recurse if not at limit
        if(depth < maxDepth && dirent.isDirectory()) {
          await hmrScan({
            root: path.join(entpath, 'node_modules'),
            depth: depth + 1,
            maxDepth
          });
        }
      }
    }

    // scan top level and @scopes
    if(command.webpackHmrPaths === 'top') {
      await hmrScan({
        root: path.join(appRoot.toString(), 'node_modules'),
        depth: 1,
        maxDepth: 1
      });
    }
    // scan entire tree
    if(command.webpackHmrPaths === 'all') {
      await hmrScan({
        root: path.join(appRoot.toString(), 'node_modules'),
        depth: 1,
        // high limit to avoid infinite recursion
        maxDepth: 100
      });
    }
    if(hmrPathsConfig.snapshot.unmanagedPaths.length) {
      logger.info('using HMR paths', {
        paths: hmrPathsConfig.snapshot.unmanagedPaths
      });
    }
  }

  // determine minimizer(s)
  const minimizerConfig = [];
  const optimizeJS = isProduction || command.webpackOptimizeJs === 'true';
  if(optimizeJS) {
    const terserOptions = {
      parallel: true,
      terserOptions: {}
    };
    if(command.webpackJsMangle !== 'default') {
      terserOptions.terserOptions.mangle =
        command.webpackJsMangle === 'true';
    }
    if(command.webpackJsBeautify !== 'default') {
      terserOptions.terserOptions.output =
        terserOptions.terserOptions.output || {};
      terserOptions.terserOptions.output.beautify =
        command.webpackJsBeautify === 'true';
    }
    if(command.webpackJsComments !== 'default') {
      terserOptions.terserOptions.output =
        terserOptions.terserOptions.output || {};
      terserOptions.terserOptions.output.comments = {
        /* eslint-disable quote-props */
        'true': true,
        'all': 'all',
        'some': 'some',
        'false': false
        /* eslint-enable quote-props */
      }[command.webpackJsComments];
    }
    const cfg = {
      optimization: {
        minimizer: [new TerserPlugin(terserOptions)]
      }
    };
    minimizerConfig.push(cfg);
  }

  // config to handle symlinks
  const symlinkConfig = {
    resolve: {
      symlinks: false
    }
  };

  // config to ensure default 'node_modules' dir is used
  const defaultConfig = {
    resolve: {
      modules: [
        'node_modules',
        path.join(appRoot.toString(), 'node_modules')
      ]
    }
  };

  if(command.webpackStats === 'true') {
    baseConfig.plugins.push(new StatsPlugin('webpack-stats.json', {
      chunkModules: true
    }));
  }

  const webpackConfig = webpackMerge(
    baseConfig,
    hmrPathsConfig,
    ...minimizerConfig,
    ...options.configs,
    ...config['bedrock-webpack'].configs,
    // FIXME: add option for symlink control
    symlinkConfig,
    // ensure node_modules is used
    defaultConfig
  );
  // FIXME: add support to output the config?
  // (difficult due to plugins and regexes)
  // fs.writeFileSync('/tmp/webpack.config.js',
  // 'const c = ' + JSON.stringify(config, null, 2) +
  // '; export {c as default};');
  if(command.webpackLogConfig === 'true') {
    console.log('webpack config:', util.inspect(webpackConfig, {
      depth: null, colors: true
    }));
  }
  let buildCount = 0;
  function webpackDone(err, {msg, stats}) {
    buildCount++;
    if(err) {
      const s = util.inspect(err, {
        depth: null, colors: true
      });
      logger.error(`error:\n${s}\n`);
      if(err.details) {
        logger.error('error details', err.details);
      }
      return err;
    }

    const info = stats.toJson();

    if(stats.hasErrors()) {
      const s = util.inspect(info.errors, {
        depth: null, colors: true
      });
      logger.error(`errors:\n${s}\n`);
      err = new BedrockError(
        'webpack error',
        'WebpackError', {
          errors: info.errors
        });
    }

    if(stats.hasWarnings()) {
      const s = util.inspect(info.errors, {
        depth: null, colors: true
      });
      logger.warning(`warnings:\n${s}\n`);
    }

    // FIXME: log/save important parts of stats/info
    // FIXME: add new option to control this output
    // reuse stats option
    if(command.webpackStats === 'true') {
      const s = stats.toString({
        chunks: false,
        colors: true
      });
      logger.info(`stats:\n${s}\n`);
    }

    const timeMs = stats.endTime - stats.startTime;
    logger.info(`${msg} complete.`, {timeMs, buildCount});

    return err;
  }

  // watch or single-run
  if(options.watch) {
    logger.info('watch starting');
    const compiler = webpack(webpackConfig);
    if(hmr) {
      bedrock.events.on('bedrock-express.configure.router', async app => {
        logger.info('watch hmr start');
        const path = '/__webpack_hmr';
        const api = await import('webpack-hot-middleware');
        const middleware = (api.default || api)(compiler, {path});
        // NOTE: middleware added like this instead of with app.use() to avoid
        // issues with HMR disrupting proper session operation
        app.get(path, (req, res, next) => {
          // HMR holds open a request from the first time a Web app is
          // loaded in a browser until the next time the site is reloaded, at
          // which point it serializes any state (including session state) to
          // disk, breaking the Web app in a variety of ways; overriding
          // `res.end` stops this bad behavior
          res.end = () => {};
          middleware(req, res, next);
        });
      });
    }
    compiler.hooks.watchRun.tap('bedrock-webpack', () => {
      logger.info('watch run');
    });
    // eslint-disable-next-line no-unused-vars
    compiler.hooks.invalid.tap('bedrock-webpack', (filename, changeTime) => {
      logger.info('watch bundle invalidated', {
        filename,
        //changeTime
      });
    });
    compiler.watch({}, (err, stats) => {
      webpackDone(err, {msg: 'watch', stats});
      // FIXME: additional error handling?
    });
    // watch in background and resolve immediately
    return;
  } else {
    logger.info('bundling starting');
    let _resolve;
    let _reject;
    const p = new Promise((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });
    webpack(webpackConfig, (err, stats) => {
      const _err = webpackDone(err, {msg: 'bundling', stats});
      if(_err) {
        _reject(_err);
        return;
      }
      _resolve();
    });
    return p;
  }
}

// build webpack config overrides from pseudo packages
async function _buildOverrideConfigs({pkgs = {}}) {
  const configs = [];
  await Promise.all(bedrock.config.views.bundle.packages.map(async pkg => {
    const data = await fs.promises.readFile(pkg.manifest);
    const manifest = JSON.parse(data);
    configs.push({
      resolve: {
        alias: {
          [manifest.name]: pkg.path
        }
      }
    });
  }));

  // create a list of packages that contain the webpack override
  const webpackOverridesManifests = Object.keys(pkgs)
    .map(key => pkgs[key].manifest)
    .filter(manifest => manifest.bedrock && manifest.bedrock.webpack);
  webpackOverridesManifests.forEach(({bedrock}) => {
    const {webpack} = bedrock;
    Object.keys(webpack).forEach(pkgName => {
      // if the override contains manifest.webpack.resolve.alias
      const config = webpack[pkgName];
      if(config) {
        configs.push(config);

        if((config.resolve || {}).alias) {
          // specially resolve alias paths to full path
          Object.keys(config.resolve.alias).forEach(alias => {
            // TODO: check to see if we can get `path` from the pseudo package
            // so we don't need to recompute here or assume top-level modules

            // resolve the relative path within a package to an absolute path
            const aliasPath = path.resolve(
              NODE_MODULES_DIR,
              pkgName,
              webpack[pkgName].resolve.alias[alias]);
            config.resolve.alias[alias] = aliasPath;
          });
        }
      }
    });
  });

  return configs;
}
