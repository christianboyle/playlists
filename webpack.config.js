const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  },
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