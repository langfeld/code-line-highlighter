const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2',
      export: 'default'
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'plugin.json', to: '.' },
        { from: 'README.md', to: '.' },
        { from: 'README_de_DE.md', to: '.' },
        { from: 'README_zh_CN.md', to: '.' },
        { from: 'icon.png', to: '.', noErrorOnMissing: true },
        { from: 'preview.png', to: '.', noErrorOnMissing: true }
      ]
    })
  ],
  externals: {
    siyuan: 'siyuan'
  }
};
