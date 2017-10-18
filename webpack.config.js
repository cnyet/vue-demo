var webpack = require("webpack");
var util = require('util');                                 //nodejs的核心模块，提供常用函数的集合
var path = require("path");                                                     //引入nodejs再带的path模块，用于处理目录的对象
var CommonsChunkPlugin = require("webpack/lib/optimize/CommonsChunkPlugin");     //将模块中公共部分抽离出来生成单独的文件
var HtmlWebpackPlugin = require("html-webpack-plugin");                          //生成HTML文件
var ExtractTextPlugin = require("extract-text-webpack-plugin");     //将js中引用的css文件分离出单个CSS文件
var CleanWebpackPlugin = require('clean-webpack-plugin');           //清理文件
var ManifestPlugin = require('webpack-manifest-plugin');            //保留所有模块的映射关系的详细要点
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');            //能够删除未引用代码压缩js插件
var postcssSprites = require('postcss-sprites');                //合并图片生产雪碧图
var sprites = postcssSprites.default;
var precss = require('precss');                     //PostCSS插件中的预处理插件包
var assets = require('postcss-assets');             //用来处理图片和 SVG,图片转换成 Base64 编码的 data url 的格式
var autoprefixer = require('autoprefixer');         //增加浏览器相关的声明前缀
var args = require('yargs').argv;                      //给程序传递参数
var isProd = Boolean(process.env.NODE_ENV === "production");             //执行命令是否包含生产环境的字段
var isDev = Boolean(process.env.NODE_ENV === "development");
var devTool = 'inline-cheap-module-source-map';
var server = require("./config/server");
var entryObj = {
    index: "./src/modules/index/index.js",
    home: "./src/modules/home/home.js",
    about: "./src/modules/about/about.js",
    common: [       
        "./src/statics/styles/ui.css" 
    ]
};
//所有页面列表
var pageArr = [
    "index",
    "home",
    "about"
];
var pluginsArr = [
    //每次构建钱先清除改目录下所有文件
    new CleanWebpackPlugin(['dist']),
    //自动加载模块，而不必到处 import 或 require
    new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        _: "lodash"
    }),
    //将公共代码抽离出来合并为一个单独文件
    new webpack.optimize.CommonsChunkPlugin({
        name: 'common', // 将公共模块提取，生成名为`common`的chunk
        filename: isProd ? 'assets/common/[name].[hash].js' : 'assets/common/[name].js',
        chunks: ['index','home', 'about'], //提取哪些模块共有的部分
        //为了防止重复可以将这些公共模块移入父 chunk，减少总体的大小，但会对首次加载时间产生不良影响
        minChunks: function(module, count){            
            if(module.resource && (/^.*\.(css|scss|less)$/).test(module.resource)) {
              return false;
            }
            return module.context && module.context.indexOf("node_modules") !== -1;
        }
    }),
    //启用模块热替换
    new webpack.HotModuleReplacementPlugin(),
    //在编译时配置的全局常量
    new webpack.DefinePlugin({
        NODE_ENV: JSON.stringify('development')
    })
];
//自动生成html页面
pageArr.forEach((page) => {
    const htmlPlugin = new HtmlWebpackPlugin({
        filename: (page=="index" ? 'index.html' : page+"/"+page+".html"),      //生成的html存放路径，相对于path
        template: 'src/modules/'+page+'/'+page+'.html',  //html模板路径
        inject: 'body',                     //js插入的位置，true/'head'/'body'/false
        //hash: true,                         //为静态资源生成hash值
        chunks: ['common', page],           //需要引入的chunk，不配置就会引入所有页面的资源
        minify: {                           //压缩HTML文件    
            removeComments: true,           //移除HTML中的注释
            collapseWhitespace: false       //删除空白符与换行符
        }
    })
    pluginsArr.push(htmlPlugin);
});
if (isDev) {
    console.log('--------------------development--------------------');
    pluginsArr.push(
        //生成映射关系的依赖图
        new ManifestPlugin({
            fileName: "manifest/manifest.json"
        }),
        //提取css文件，单独使用link标签加载css并设置路径，相对于output配置中的publickPath
        new ExtractTextPlugin({
            filename: (getPath) => {            
                return getPath('[name]/[name].css').replace('common', 'assets/common');
            },
            allChunks: true
        })
    )
}
if (isProd) {
    console.log('--------------------production--------------------');
    pluginsArr.push(
        //在编译出现错误时跳过输出阶段,确保输出资源不会包含错误
        new webpack.NoEmitOnErrorsPlugin(),
        //删除未引用代码,压缩js插件
        new UglifyJSPlugin({
            uglifyOptions: {
              ie8: false,       //是否支持ie8
              ecma: 5,          //支持ECMAScript的版本
              output: {},       //默认输出为最佳压缩优化
              compress: true,   //压缩选项
              warnings: false   //显示警告提示
            }
        }),
        //提取css文件，单独使用link标签加载css并设置路径，相对于output配置中的publickPath
        new ExtractTextPlugin({
            filename: (getPath) => {            
                return getPath('[name]/[name].[hash].css').replace('common', 'assets/common');                
            },
            allChunks: true
        })
    );
    devTool = "inline-source-map";
}
module.exports = {
    //配置入口文件
    entry: entryObj,    
    //打包输出文件
    output: { 
        path: path.resolve(__dirname, "dist"),          //输出文件目录
        filename: "[name]/[name].js",                       //输出文件名定义
        chunkFilename: '[name]/[name].bundle.js',              //设置非入口文件chunk的文件名
        publicPath: '/'                                 //指定在浏览器中所引用的目录,设置服务器上的资源根目录
    },
    //loader用于对模块的源代码进行转换
    module: {       
        //当遇到在require()/import加载的文件时，打包之前先使用对应的loader转换一下
        rules: [
            {                
                test: /\.js$/,
                exclude: /node_modules/,
                loader: "eslint-loader",
                options: {
                    fix: true,
                    emitError: true,  
                }
            }, {
                test: /\.css$/, 
                include: [
                    path.resolve(__dirname, "src/statics/styles/")
                ],                    
                use: ExtractTextPlugin.extract({ 
                    fallback: "style-loader",   
                    use: ['css-loader']                     
                }),
            }, {
                test: /\.css$/,   
                exclude: [
                    path.resolve(__dirname, "src/statics/styles/"),
                ],                  
                use: ExtractTextPlugin.extract({    
                    fallback: "style-loader",  
                    use: [
                        {loader: 'css-loader', options: { importLoaders: 1 }},
                        {loader: 'postcss-loader',
                            options:{
                                plugins: [
                                    require('postcss-import'),
                                    require('postcss-assets'),
                                    require('autoprefixer'),
                                    require('cssnano')
                                ]
                            }                      
                        }
                    ]             
                })
            }, {
                test: /\.less$/,
                use: ExtractTextPlugin.extract({    
                    fallback: "style-loader",  
                    use: [
                        {loader: 'css-loader', options: { importLoaders: 1 }},
                        {loader: 'less-loader'},
                        {loader: 'postcss-loader',
                            options:{
                                plugins: [
                                    require('postcss-import'),
                                    require('postcss-assets'),
                                    require('autoprefixer'),
                                    require('cssnano')
                                ]
                            }                      
                        }
                    ]             
                })
            }, {
                test: /\.(png|jpg|gif)$/, 
                use: ['file-loader?limit=8192&name=assets/images/[name].[ext]']
            }, {
                test: /\.(woff|woff2|eot|ttf|otf|svg)$/, 
                use: ['file-loader?name=assets/fonts/[name].[ext]']
            }, {
                test: /\.html$/,
                use: {
                    loader: "html-loader",
                    options: {
                        // attrs: [":data-src"],
                        interpolate: "require"                         
                    }
                }
            }, {
                test: /\.hbs$/,
                use: "handlebars-loader"        
            }
        ]
    },
    //设置模块如何被解析
    resolve: {
        alias: {
            // bootstrap: "bootstrap/dist/css/bootstrap.min.css",
        }
    },
    //解决loader无法实现的事
    plugins: pluginsArr,
    //编译后的代码映射回原始源代码
    devtool: devTool,       
    //web服务器
    devServer: server
};