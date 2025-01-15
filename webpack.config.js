const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: './index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'window.APP_CONFIG': JSON.stringify({
        clientId: process.env.SOUNDCLOUD_CLIENT_ID || '',
        clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET || ''
      })
    })
  ],
  devServer: {
    static: [
      {
        directory: path.join(__dirname, '/'),
        publicPath: '/'
      },
      {
        directory: path.join(__dirname, 'dist'),
        publicPath: '/'
      }
    ],
    hot: false,
    open: true,
    port: 8087,
    host: '0.0.0.0',
    allowedHosts: 'all',
    historyApiFallback: true,
    liveReload: false,
    watchFiles: {
      paths: [],
      options: {
        ignored: '**/*',
        poll: false
      }
    },
    devMiddleware: {
      writeToDisk: true
    }
  }
}; 