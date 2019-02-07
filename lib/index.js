/*
 * Bedrock webpack Module
 *
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const async = require('async');
const bedrock = require('bedrock');
const config = bedrock.config;
const fs = require('fs');
const filesize = require('file-size');
const path = require('path');
const util = require('util');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const StatsPlugin = require('stats-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const BedrockError = bedrock.util.BedrockError;

// load config defaults
require('./config');

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app').child('bedrock-webpack');
const NODE_MODULES_DIR = path.resolve(__dirname, '../../../node_modules');

bedrock.events.on('bedrock-views.cli.optimize.configure', command => {
  command
    .option('--webpack-uglify <mode>',
      'Use webpack uglifyjs plugin (true, false) [true]',
      /^(true|false)$/i, 'true')
    .option('--webpack-uglify-mangle <mode>',
      'webpack uglifyjs mangle mode (true, false) [true]',
      /^(true|false)$/i, 'true')
    .option('--webpack-uglify-beautify <mode>',
      'webpack uglifyjs beautify mode (true, false) [false]',
      /^(true|false)$/i, 'false')
    .option('--webpack-profile <mode>',
      'webpack profile mode (true, false) [false]',
      /^(true|false)$/i, 'false')
    .option('--webpack-stats <mode>',
      'webpack stats generation mode (true, false) [false]',
      /^(true|false)$/i, 'false');
});

bedrock.events.on('bedrock-views.optimize.run', (options, callback) => {
  const start = Date.now();
  logger.info('Optimizing...');

  const output = options.output || config['bedrock-webpack'].out;
  const paths = options.paths || config['bedrock-webpack'].paths;

  async.auto({
    overrideConfigs: callback => _buildOverrideConfigs(options, callback),
    optimize: ['overrideConfigs', (results, callback) => {
      api.optimize({
        main: options.input,
        output,
        paths,
        configs: [
          ...results.overrideConfigs,
          // FIXME: this should be a param
          {
            resolve: {
              modules: [
                path.dirname(bedrock.config.views.system.paths.importAll)
              ],
              symlinks: false
            }
          }
        ]
      }, callback);
    }],
    report: ['optimize', (results, callback) => {
      const outSize = filesize(fs.statSync(output).size).human();
      const time = Date.now() - start;
      logger.info(
        'Optimization complete (' + outSize + ') in ' + time + 'ms. ' +
        'Written to: ' + output);
      callback();

    }]
  }, callback);
});

/**
 * Optimizes the main entry points using webpack into a single file.
 *
 * @param [options] the options to use.
 *          [main] a string or array of entry points
 *          [output] filename to output
 *          [paths] paths for output (local and public)
 *          [configs] an array of webpack configs to merge
 * @param callback(err) called once the operation completes.
 */
api.optimize = function(options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};

  if(!('main' in options)) {
    return callback(new BedrockError(
      'webpack optimize missing main entry point',
      'WebpackError'));
  }

  options.configs = options.configs || [];
  const paths = Object.assign({
    local: path.dirname(options.output),
    publicPath: '/'
  }, options.paths || {});

  logger.info('webpack optimizer running...');

  const command = bedrock.config.cli.command;
  const entry = [
    ...config['bedrock-webpack'].baseEntry,
    ...options.main
  ];

  logger.info(`Optimizing: "${entry}" to: "${options.output}"`);

  if(!paths.public.endsWith('/')) {
    paths.public += '/';
  }

  const baseConfig = {
    context: path.resolve(__dirname, '../../..'),
    mode: 'production',
    entry: {
      main: entry
    },
    output: {
      path: paths.local,
      publicPath: paths.public,
      filename: path.basename(options.output)
    },
    resolve: {
      modules: [
        // top level node_modules dir
        // FIXME: get this via location independent method
        NODE_MODULES_DIR
      ],
      alias: {
        // often will need an alias in each projects config like:
        // 'my-project': path.resolve(__dirname, '../components')
      }
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          // common modules to exclude from processing
          exclude: [
            /node_modules\/angular\//,
            /node_modules\/angular-material\//,
            /node_modules\/lodash\//,
            /node_modules\/localforage\//
          ],
          use: {
            loader: require.resolve('babel-loader'),
            options: {
              presets: [
                // normal mode
                require.resolve('babel-preset-env')
                // debug mode
                //[require.resolve('babel-preset-env'), { debug: true }]
              ],
              plugins: [
                require.resolve('babel-plugin-angularjs-annotate'),
                require.resolve('babel-plugin-syntax-dynamic-import'),
                [
                  require.resolve('babel-plugin-transform-object-rest-spread'),
                  {useBuiltIns: true}
                ]
              ]
            }
          }
        },
        {
          test: /\.less$/,
          use: [
            'vue-style-loader',
            'css-loader',
            'less-loader'
          ]
        },
        {
          test: /\.scss$/,
          use: [
            'vue-style-loader',
            'css-loader',
            {
              loader: 'sass-loader'
            }
          ]
        },
        {
          test: /\.styl(us)?$/,
          use: [
            'vue-style-loader',
            'css-loader',
            'stylus-loader'
          ]
        },
        {
          test: /\.vue$/,
          use: {
            loader: require.resolve('vue-loader'),
            options: {
              hotReload: false,
              cssSourceMap: false,
              loaders: {
                js: [
                  {
                    loader: require.resolve('babel-loader'),
                    options: {
                      presets: [
                        // normal mode
                        require.resolve('babel-preset-env')
                      ],
                      plugins: [
                        require.resolve('babel-plugin-syntax-dynamic-import'),
                        [
                          require.resolve(
                            'babel-plugin-transform-object-rest-spread'),
                          {useBuiltIns: true}
                        ]
                      ]
                    }
                  }
                ],
                css: require.resolve('vue-style-loader') + '!' +
                  require.resolve('css-loader')
              }
            }
          }
        }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': '"production"',
        'process.env.DEBUG': '"false"',
        'process.env.BUILD': '"web"'
      })
    ],
    profile: command.webpackProfile === 'true',
    node: {
      // FIXME these disable polyfills globally
      'base64-js': false,
      Buffer: false,
      crypto: false,
      ieee754: false,
      process: false,
      setImmediate: false
    }
  };

  if(command.webpackUglify === 'true') {
    const uglifyOptions = {
      mangle: command.webpackUglifyMangle === 'true',
      beautify: command.webpackUglifyBeautify === 'true'
    };
    baseConfig.optimization = {
      minimizer: [
        new UglifyJsPlugin({uglifyOptions})
      ],
      minimize: true
    };
  }

  if(command.webpackStats === 'true') {
    baseConfig.plugins.push(new StatsPlugin('webpack-stats.json', {
      chunkModules: true
    }));
  }

  const webpackConfig = webpackMerge(
    baseConfig, ...options.configs, ...config['bedrock-webpack'].configs);
  // FIXME: add support to output the config? (hard due to plugins and regexes)
  //fs.writeFileSync('/tmp/webpack.config.js', 'module.exports = ' + JSON.stringify(config, null, 2));
  //callback();
  webpack(webpackConfig, (err, stats) => {
    if(err) {
      logger.error('webpack error', err.stack || err);
      if(err.details) {
        logger.error('webpack error details', err.details);
      }
      return callback(err);
    }

    const info = stats.toJson();

    if(stats.hasErrors()) {
      logger.error('webpack errors:\n' + info.errors);
      err = new BedrockError(
        'webpack error',
        'WebpackError', {
          'errors': info.errors
        });
    }

    if(stats.hasWarnings()) {
      logger.warning('webpack warnings', info.warnings);
    }

    // FIXME: log/save important parts of stats/info
    // FIXME: add options to control this output
    /*
    let statsString = stats.toString({
      chunks: false,
      colors: true
    });
    logger.info(`webpack stats:\n${statsString}\n`);
    */

    callback(err);
  });
};

// build webpack config overrides from pseudo packages
async function _buildOverrideConfigs({pkgs = {}}, callback) {
  const readFile = util.promisify(fs.readFile);
  const configs = [];
  try {
    const sysPckgs = bedrock.config.views.system.packages.map(async (pkg) => {
      const data = await readFile(pkg.manifest);
      const manifest = JSON.parse(data);
      configs.push({
        resolve: {
          alias: {
            [manifest.name]: pkg.path
          }
        }
      });
    });
    await Promise.all(sysPckgs);
  } catch(e) {
    return callback(e);
  }

  // create a list of packages that contain the webpack override
  const webpackOverridesManifests = Object.keys(pkgs)
    .map(key => pkgs[key].manifest)
    .filter(manifest => manifest.bedrock && manifest.bedrock.webpack);
  webpackOverridesManifests.map(({bedrock}) => {
    const {webpack} = bedrock;
    Object.keys(webpack).forEach(pkgName => {
      // if the override contains manifest.webpack.resolve.alias
      const config = webpack[pkgName];
      if(config) {
        configs.push(config);
      }

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
    });
  });

  callback(null, configs);
}
