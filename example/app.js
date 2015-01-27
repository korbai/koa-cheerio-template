var path = require('path');
var app = require('koa')();
var render = require('koa-cheerio-template');

app.use(render({
  root: path.join(__dirname, 'views/'),
  ext: '.html'
}));

app.use(function * (next) {
  var $ = yield this.render('index');
});

app.listen(3000);
