/*
 * Bedrock webpack Module
 *
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
const _ = require('lodash');
const bedrock = require('bedrock');
const config = bedrock.config;
const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const BedrockError = bedrock.util.BedrockError;

// load config defaults
require('bedrock-docs');
require('bedrock-express');
require('./config');

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app');

//bedrock.events.on('bedrock-cli.init', () => {
bedrock.events.on('bedrock-views.cli.optimize.init', (command) => {
  command
    .option('--webpack-uglify <mode>',
      'Use webpack uglifyjs plugin (true, false) [true]',
      /^(true|false)$/i, 'true')
    .option('--webpack-uglify-mangle <mode>',
      'webpack uglifyjs mangle mode (true, false) [true]',
      /^(true|false)$/i, 'true')
    .option('--webpack-uglify-beautify <mode>',
      'webpack uglifyjs beautify mode (true, false) [false]',
      /^(true|false)$/i, 'false');
});

// FIXME?
// expose webpack-merge
//api.merge = webpackMerge;

/**
 * Optimizes the main entry points using webpack into a single file.
 *
 * @param [options] the options to use.
 *          [main] a string or array of entry points
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

  logger.info('webpack optimizer running...');

  const command = bedrock.config.cli.command;
  const entry = ['babel-polyfill'].concat(options.main)
  const output = bedrock.config['bedrock-webpack'].out;
  logger.info(
    `[bedrock-webpack] optimizing: "${entry}" to: "${output}"`);

  const baseConfig = {
    context: path.resolve(__dirname, '../../..'),
    entry: {
      main: entry
    },
    output: {
      // FIXME: currently just supporting one static output name
      path: path.dirname(output),
      filename: path.basename(output)
    },
    resolve: {
      modules: [
        // top level node_modules dir
        // FIXME: get this via location independent method
        path.resolve(__dirname, '../../../node_modules')
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
          // some common modules to exclude from processing
          exclude: [
            /node_modules\/angular/,
            /node_modules\/angular-material/,
            /node_modules\/lodash/
          ],
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                //['env', { debug: true }]
                'env'
              ],
              plugins: [
                'angularjs-annotate'
              ]
            }
          }
        }
      ]
    },
    plugins: [],
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
    const opts = {
      mangle: command.webpackUglifyMangle === 'true',
      beautify: command.webpackUglifyBeautify === 'true'
    };
    baseConfig.plugins.push(new webpack.optimize.UglifyJsPlugin(opts));
  }

  const webpackConfig = webpackMerge(
    baseConfig, ...options.configs, ...config['bedrock-webpack'].configs);

  // FIXME: add support to output the config? (hard due to plugins and regexes)
  //fs.writeFileSync('/tmp/webpack.config.js', 'module.exports = ' + JSON.stringify(config, null, 2));
  //callback();

  webpack(webpackConfig, (err, stats) => {
    if(err) {
      logger.error('[bedrock-webpack] webpack error', err.stack || err);
      if(err.details) {
        logger.error('[bedrock-webpack] webpack error details', err.details);
      }
      return callback(err);
    }

    const info = stats.toJson();

    if(stats.hasErrors()) {
      logger.error('[bedrock-webpack] webpack errors:\n' + info.errors);
      err = new BedrockError(
        'webpack error',
        'WebpackError', {
          'errors': info.errors
        });
    }

    if(stats.hasWarnings()) {
      logger.warning('[bedrock-webpack] webpack warnings', info.warnings);
    }

    // FIMXE: log important parts of stats/info
    //logger.info('[bedrock-webpack] stats', stats.xxxxxx);

    callback(err);
  });
};
