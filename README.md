# koa-cheerio-template

Templating for [koa](http://koajs.com/) using [cheerio](https://github.com/MatthewMueller/cheerio).
Inspired by [cheerio-template](https://www.npmjs.com/package/cheerio-template)
which I used a lot for my express based projects.

# Features
- "no template" style server side templating with jQuery syntax
- optional isomorphic support (see [example](https://github.com/korbai/koa-cheerio-template/tree/master/example))
- layout, extend, placeholder, block, include
- unlimited level of hierarchy
- html editor friendly

# Installation
```
npm install koa-cheerio-template
```

# Example

views/index.html
```html
<div data-template-extend="main"></div>

<div data-template-block="head">
    <title>Templating Demo</title>
</div>

<div data-template-block="content">
    <h2>Sample for including component</h2>
    <div data-template-include="component"></div>
    Hello <span id="hello"></span>
</div>

<script data-template-block="code">
    var z = 345;
</script>
```
See the full [example](https://github.com/korbai/koa-cheerio-template/tree/master/example)!


```js
var path = require('path');
var app = require('koa')();
var render = require('koa-cheerio-template');

app.use(render({
  root: path.join(__dirname, 'views/'),
  ext: '.html'
}));

app.use(function * (next) {
  var $ = yield this.render('index');
  $('#hello').text(', World!');
});

app.listen(3000);
```
see [cheerio-readme](https://github.com/cheeriojs/cheerio/blob/master/Readme.md)
and [htmlparser2](https://github.com/fb55/htmlparser2/wiki/Parser-options)
for more information
```
# License

  MIT
