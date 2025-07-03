const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/icppass_extension/background.js',
    popup: './src/icppass_extension/popup.js',
    content: './src/icppass_extension/content.js',
    welcome: './src/icppass_extension/welcome.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist/extension'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    fallback: {
      "buffer": require.resolve("buffer/"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
    }
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: './src/icppass_extension/manifest.json', to: '' },
        { from: './src/icppass_extension/popup.html', to: '' },
        { from: './src/icppass_extension/popup.css', to: '' },
        { from: './src/icppass_extension/welcome.html', to: '' },
        { from: './src/icppass_extension/icons', to: 'icons' }
      ],
    }),
  ],
}; 