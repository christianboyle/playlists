const Dotenv = require('dotenv-webpack');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: process.env.NODE_ENV === 'production' ? '/dist/' : '/'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, '/'),
    },
    hot: true,
    open: true,
    port: 8080
  },
  plugins: [
    new Dotenv()
  ]
}; 