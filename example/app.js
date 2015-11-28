var _ = require('lodash');
var path = require('path');
var app = require('koa')();
var render = require('../'); // koa-cheerio-template

// for controllers simplicity combine all parameter sources to one object
app.use(function *(next) {
  // this.data will be given to all render functions
  this.state = _.merge({}, this.request.body, this.query, this.params /* koa-resource-router ID */);
  yield next;
});

var options = {
  root: path.join(__dirname, 'views/'),
  ext: '.html'
};

app.use(render(options));

app.use(function * (next) {
  // parameter for server/client side code
  this.state.name = 'from the Server';
  // after full server side render call index.html.js::render()
  var $ = yield this.render('index');
  // final step, server only code
  $('#goal').text('42!');
});

// see http://localhost:3000/index
app.listen(3000);
