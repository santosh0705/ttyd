const HtmlWebPackPlugin = require('html-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (env, argv) => {
  return {
    entry: './src/client.js',
    output: {
      filename: '[name].js'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader'
          }
        },
        {
          test: /\.s?[ac]ss$/,
          use: [
            argv.mode === 'production' ? MiniCssExtractPlugin.loader : 'style-loader',
            {
              loader: 'css-loader',
              options: {
                minimize: argv.mode === 'production'
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: [
                  require('autoprefixer')
                ]
              }
            },
            'sass-loader'
          ]
        },
        {
          test: /\.(png|jpg|gif)$/,
          use: [
            {
              loader: argv.mode === 'production' ? 'url-loader' : 'file-loader',
              options: argv.mode === 'production' ? { limit: 0 } : { name: '[name].[ext]' }
            }
          ]
        }
      ]
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: './src/index.html',
        filename: './index.html',
        inlineSource: '.(js|css)$',
        minify: {
          collapseInlineTagWhitespace: true,
          collapseWhitespace: true,
          minifyCSS: true
        }
      }),
      new HtmlWebpackInlineSourcePlugin(),
      new CopyWebpackPlugin(
        [
          { from: 'src/favicon.png', to: '.' }
        ],
        {}
      ),
      new MiniCssExtractPlugin()
    ],
    performance: {
      hints: false
    },
    devServer: {
      host: '0.0.0.0',
      port: 8080,
      before: function (app) {
        app.get('/', function (req, res, next) {
          if (Object.keys(req.query).length > 0) {
            res.redirect('/redir' + req.url)
          }
          return next()
        })
      },
      proxy: [
        {
          context: '/redir',
          pathRewrite: {
            '^/redir': '/'
          },
          target: 'http://127.0.0.1:7681'
        },
        {
          context: ['/ws', '/auth_token.js'],
          target: 'http://127.0.0.1:7681',
          ws: true
        }
      ]
    }
  }
}
