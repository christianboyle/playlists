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
    new Dotenv(),
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
    hot: true,
    open: false,
    port: 8087,
    host: '0.0.0.0',
    allowedHosts: 'all',
    historyApiFallback: true,
    watchFiles: {
      paths: ['**/*'],
      options: {
        usePolling: true
      }
    },
    proxy: [{
      context: ['/api'],
      target: 'http://localhost:3000',
      secure: false,
      changeOrigin: true
    }],
    devMiddleware: {
      writeToDisk: true
    }
  }
}; 