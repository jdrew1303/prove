'use strict';

var path = require('path'),
  webpack = require('webpack'),
  htmlPlugin = require('html-webpack-plugin'),
  ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    main: ['./dashboard/js/main.jsx']
  },
  output: {
    path: path.join(__dirname, 'public/www'),
    filename: '[name].js',
    chunkFilename: '[chunkhash].js',
    publicPath: '/'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: ['babel'],
        query: {
          presets: ['es2015', 'react', 'stage-0']
        }
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.(otf|eot|svg|ttf|woff|woff2)(\?.+)?$/,
        loader: 'url-loader?limit=8192'
      },
      {
        test: /\.less$/,
        loader: 'style!css!less'
      },
      {
        test: /\.scss$/,
        loaders: ['style', 'css', 'sass']
      }
    ]
  },
  resolve: {
    extensions: ['', '.js', '.jsx', '.less'],
    modulesDirectories: ['node_modules'],
    alias: {
      components: path.join(__dirname, 'dashboard/js/components'),
      modules: path.join(__dirname, 'dashboard/js/modules'),
      css: path.join(__dirname, 'dashboard/css'),
      chartistCSS: path.join(__dirname, 'node_modules/chartist/dist/scss')
    }
  },
  plugins: [
    new ExtractTextPlugin('bundle.css'),
    new htmlPlugin({
      filename: 'index.html',
      template: './dashboard/index.html',
      socketUrl: 'http://localhost:8080'
    })
  ]
};