/*
 * Bedrock webpack Module
 *
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const appRoot = require('app-root-path');
const bedrock = require('bedrock');
const config = bedrock.config;
const fs = require('fs');
const filesize = require('file-size');
const path = require('path');
const util = require('util');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const {BedrockError} = bedrock.util;
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const StatsPlugin = require('stats-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

// load config defaults
require('./config');

// module API
const api = {};
module.exports = api;

const logger = bedrock.loggers.get('app').child('bedrock-webpack');
const NODE_MODULES_DIR = path.resolve(__dirname, '../../../node_modules');

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

    // CSS options
    .option('--webpack-optimize-css <mode>',
      'Optimize CSS' +
      ' (true, false, mode).',
      /^(true|false|mode)$/i, 'true')
    .option('--webpack-extract-css <mode>',
      'Extract CSS' +
      ' (true, false).',
      /^(true|false)$/i, 'false')

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
      'Use hot-module-reload in development mode' +
      ' (true, false).',
      /^(true|false)$/i, 'true')

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
    .option('--webpack-symlink-watch <mode>',
      'Dereference top-level node_module symlinks in watch mode' +
      ' (true, false).',
      /^(true|false)$/i, 'true')
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

  await api.bundle({
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
 * @param [options] the options to use.
 *          [main] a string or array of entry points
 *          [output] filename to output
 *          [paths] paths for output (local and public)
 *          [configs] an array of webpack configs to merge
 *          [optimize] true to optimize
 *          [watch] true to watch for changes
 */
api.bundle = async (options = {}) => {
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
  //const command = bedrock.config.cli.command;
  const command = bedrock.program;

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

  // optimize CSS mode
  const webpackOptimizeCssPlugin = [];
  if(isProduction && command.webpackOptimizeCss === 'true') {
    webpackOptimizeCssPlugin.push(new OptimizeCSSAssetsPlugin());
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
  // use CLI defines
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

  // common CSS extraction loader
  const webpackMiniCssExtractPlugin = [];
  const miniCssExtractPluginLoader = [];
  // FIXME: always or only when 'isProduction'?
  // FIXME: make default with top-level static import CSS loads
  if(command.webpackExtractCss === 'true') {
    webpackMiniCssExtractPlugin.push(new MiniCssExtractPlugin({
      //filename: path.join(paths.local, 'css', '[name].css')
      filename: '../css/[name].css'
    }));
    miniCssExtractPluginLoader.push({
      loader: MiniCssExtractPlugin.loader,
      options: {
        //publicPath: '../css/',
        /*
        publicPath: (resourcePath, context) => {
          console.log('PP', {resourcePath, context,
            r: path.relative(path.dirname(resourcePath), context) + '/'});
          // publicPath is the relative path of the resource to the context
          // e.g. for ./css/admin/main.css the publicPath will be ../../
          // while for ./css/main.css the publicPath will be ../
          return path.relative(path.dirname(resourcePath), context) + '/';
        },
        */
        hmr
      }
    });
  }

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
      filename: path.basename(options.output)
    },
    resolve: {
      alias: {
        // often will need an alias in each projects config like:
        // 'my-project': path.resolve(__dirname, '../components')
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
                    corejs: 3,
                    debug: command.webpackBabelDebug === 'true'
                  }
                ]
              ],
              plugins: [
                require.resolve('@babel/plugin-syntax-dynamic-import'),
                [
                  require.resolve('@babel/plugin-proposal-object-rest-spread'),
                  {useBuiltIns: true}
                ]
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            require.resolve('vue-style-loader'),
            ...miniCssExtractPluginLoader,
            require.resolve('css-loader')
          ]
        },
        {
          test: /\.less$/,
          use: [
            require.resolve('vue-style-loader'),
            ...miniCssExtractPluginLoader,
            require.resolve('css-loader'),
            require.resolve('less-loader')
          ]
        },
        {
          test: /\.scss$/,
          use: [
            require.resolve('vue-style-loader'),
            ...miniCssExtractPluginLoader,
            require.resolve('css-loader'),
            require.resolve('sass-loader')
          ]
        },
        {
          test: /\.styl(us)?$/,
          use: [
            require.resolve('vue-style-loader'),
            ...miniCssExtractPluginLoader,
            require.resolve('css-loader'),
            require.resolve('stylus-loader')
          ]
        },
        /*
        {
          test: /\.(css|less|scss|styl(us)?)$/,
          use: [
            ...miniCssExtractPluginLoader,
            'css-loader'
          ]
        },
        */
        {
          test: /\.vue$/,
          loader: require.resolve('vue-loader'),
          options: {
            hotReload: hmr
          }
        },
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
        },
      ]
    },
    plugins: [
      ...webpackDefinePlugin,
      ...webpackCleanPlugin,
      ...webpackMiniCssExtractPlugin,
      ...webpackOptimizeCssPlugin,
      new VueLoaderPlugin(),
      ...webpackProgressPlugin,
      ...webpackHmrPlugin
    ],
    profile: command.webpackProfile === 'true',
    node: {
      // FIXME: these disable polyfills globally
      'base64-js': false,
      Buffer: false,
      crypto: false,
      ieee754: false,
      process: false,
      setImmediate: false
    }
  };

  const aliasConfig = {
    resolve: {
      alias: {}
    }
  };
  // FIXME: remove this when watch support handles symlinks
  if(command.webpackSymlinkWatch === 'true') {
    // find root node_modules dir symlinks and add as aliases
    const modDir = path.join(appRoot.toString(), 'node_modules');
    const modDirents = await fs.promises.readdir(modDir, {withFileTypes: true});
    for(const dirent of modDirents) {
      if(dirent.isSymbolicLink()) {
        const from = path.join(appRoot.toString(), 'node_modules', dirent.name);
        const to = await fs.promises.realpath(from);
        aliasConfig.resolve.alias[from] = to;
      }
    }
  }
  if(Object.keys(aliasConfig.resolve.alias).length) {
    logger.info('using symlink aliases', {
      aliases: aliasConfig.resolve.alias
    });
  }

  const minimizerConfig = [];
  if(command.webpackOptimizeJs === 'true' || isProduction) {
    const terserOptions = {
      cache: config['bedrock-webpack']['terser'].cache,
      parallel: true,
      sourceMap: true,
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
        minimizer: [
          new TerserPlugin(terserOptions)
        ]
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
    aliasConfig,
    ...minimizerConfig,
    ...options.configs,
    ...config['bedrock-webpack'].configs,
    // FIXME: add option for symlink control
    symlinkConfig,
    // ensure node_modules is used
    defaultConfig
  );
  // FIXME: add support to output the config? (difficult due to plugins and regexes)
  //fs.writeFileSync('/tmp/webpack.config.js', 'module.exports = ' + JSON.stringify(config, null, 2));
  if(command.webpackLogConfig === 'true') {
    console.log('webpack config:', util.inspect(webpackConfig, {
      depth: null, colors: true
    }));
  }
  let buildCount = 0;
  function webpackDone(err, {msg, stats}) {
    buildCount++;
    if(err) {
      logger.error('error', err.stack || err);
      if(err.details) {
        logger.error('error details', err.details);
      }
      return err;
    }

    const info = stats.toJson();

    if(stats.hasErrors()) {
      const s = info.errors.toString();
      logger.error(`errors:\n${s}\n`);
      err = new BedrockError(
        'webpack error',
        'WebpackError', {
          errors: info.errors
        });
    }

    if(stats.hasWarnings()) {
      const s = info.warnings.toString();
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
    const size = fs.statSync(options.output).size;
    const sizeStr = filesize(size).human();
    logger.info(`${msg} complete (${sizeStr})`, {
      timeMs, size, output: options.output, buildCount
    });

    return err;
  }

  // watch or single-run
  if(options.watch) {
    logger.info('watch starting');
    const compiler = webpack(webpackConfig);
    if(hmr) {
      bedrock.events.on('bedrock-express.configure.router', app => {
        logger.info('watch hmr start');
        const path = '/__webpack_hmr';
        const middleware = require('webpack-hot-middleware')(compiler, {path});
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
};

// build webpack config overrides from pseudo packages
async function _buildOverrideConfigs({pkgs = {}}) {
  const readFile = fs.promises.readFile;
  const configs = [];
  await Promise.all(bedrock.config.views.bundle.packages.map(async pkg => {
    const data = await readFile(pkg.manifest);
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

  return configs;
}
