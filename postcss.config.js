// https://github.com/michael-ciniawsky/postcss-load-config

module.exports = {
  "plugins": {
    // to edit target browsers: use "browserslist" field in package.json
    //添加浏览器前缀
    "autoprefixer": {},
    //检测到主样式表中@import的文件然后合并到文件中，自动发现Bower Component和Node Module中样式文件
    'postcss-import': {},
    //处理图片和 SVG
    'postcss-assets': {},
    //压缩和优化样式表的功能
    'cssnano': {}
  }
}
