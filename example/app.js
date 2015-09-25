var _ = require('lodash');
var path = require('path');
var app = require('koa')();
var render = require('../'); // koa-cheerio-template

// for controllers simplicity combine all parameter sources to one object
app.use(function *(next) {
  // this.data will be given to all render functions
  this.data = _.merge({}, this.request.body, this.query, this.params /* koa-resource-router ID */);
  yield next;
});

var options = {
  root: path.join(__dirname, 'views/'),
  // this option switch on the isomorphic support
  // browserify will generate compiled bundles into this directory
  bundles: 'public/bundles/',
  ext: '.html'
};

app.use(render(options));

app.use(function * (next) {
  // parameter for server/client side code
  this.data.name = 'from the Server';
  // after full server side render call index.html.js::render()
  var $ = yield this.render('index');
  // final step, server only code
  $('#goal').text('42!');
});

app.listen(3000);
