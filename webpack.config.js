const path = require('path');
const webpack = require('webpack');
const Dotenv = require('dotenv-webpack');
const fs = require('fs');

// Determine if .env file exists
const hasEnvFile = fs.existsSync(path.resolve(__dirname, '.env'));

// Create plugins array based on environment
const plugins = [
  new webpack.DefinePlugin({
    'window.APP_CONFIG': JSON.stringify({
      clientId: process.env.SOUNDCLOUD_CLIENT_ID || '',
      clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET || ''
    })
  })
];

// Only add Dotenv plugin if .env file exists
if (hasEnvFile) {
  plugins.push(new Dotenv({
    systemvars: true // Load all system variables as well
  }));
}

module.exports = {
  entry: {
    bundle: './index.js',
    config: './src/config.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/dist/'
  },
  plugins,
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