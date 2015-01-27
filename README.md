# koa-cheerio-template

Templating for [koa](http://koajs.com/) using [cheerio](https://github.com/MatthewMueller/cheerio).
Inspired by [cheerio-template](https://www.npmjs.com/package/cheerio-template)
which I used a lot for my express based projects.

# Features
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
</div>

<script data-template-block="code">
    var z = 345;
</script>
```
See the full [example](https://github.com/korbai/koa-cheerio-template/example/)!


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
});

app.listen(3000);
```

You can also pass an extra object if you need to modify any
of the default parsing options:

```js
var $ = yield this.render('index', {
  normalizeWhitespace: true,
  xmlMode: true
});
```
Comment from the [cheerio-readme](https://github.com/cheeriojs/cheerio/blob/master/Readme.md):
These parsing options are taken directly from [htmlparser2](https://github.com/fb55/htmlparser2/wiki/Parser-options), therefore any options that can be used in `htmlparser2` are valid in cheerio as well. The default options are:
```js
{
    normalizeWhitespace: false,
    xmlMode: false,
    decodeEntities: true
}
```
# License

  MIT
