var fs = require('co-fs-extra');
var path = require('path');
var cheerio = require('cheerio');
var compose = require('koa-compose');
var debug = require('debug')('template');
//debug = console.log;

// supports div and script tag, too with optional value
function dataTag(name, value) {
  if (value) name += '="' + value + '"';
  return 'div[data-template-' + name + '], script[data-template-' + name + ']';
}

module.exports = function (settings) {
  var genRenders = {};
  var isoRenders = {};
  settings = settings || {};
  settings.root = settings.root || __dirname;
  settings.ext = settings.ext || '.html';
  settings.server = settings.server || require('koa-static');

  var middlewares = [];
  middlewares.push(middleware);
  middlewares.push(settings.server(settings.root));
  return compose(middlewares);

  function *genRender(viewfile) {
    var name = viewfile.substr(0, viewfile.length - settings.ext.length);
    var js = name + '.js';
    var gen = js.substr(settings.root.length);
    var r = genRenders[js];
    if (!r) {
      if (yield fs.exists(js)) {
        r = require(js);
        if (r.render) {
          debug('registering gen render', js);
        }
        else {
          r = {};
        }
      }
      else {
        r = {};
      }
      genRenders[js] = r;
    }
    if (r && r.render) {
      yield r.render.call(this);
      return;
    }
  }

  function *isoRender(viewfile, $, data) {
    var js = viewfile + '.js';
    var iso = js.substr(settings.root.length);
    var r = isoRenders[js];
    if (!r) {
      if (yield fs.exists(js)) {
        debug('registering iso render', js);
        r = require(js);
      } else {
        // not to check again and again file exist
        // so registering an empty stub
        r = function () { return false; };
      }
      isoRenders[js] = r;
    }
    if (r($, data)) {
      var script = '<script src="/' + iso + '"></script>';
      this.bundles = this.bundles || [];
      this.bundles.push(script);
    }
  }

  function *render(view, opts) {
    var $;
    opts = opts || {};
    opts.blocks = opts.blocks || {};
    // theoretically unlimited parent view
    while (view) {
      var viewfile = path.join(settings.root, view + settings.ext);
      debug('rendering', viewfile);
      var text = yield fs.readFile(viewfile, 'utf8');
      this.$ = $ = cheerio.load(text, opts);
      yield genRender.call(this, viewfile);
      yield isoRender.call(this, viewfile, $, this.state);
      // first: replace all include-placeholders with given contents
      var includes = [];
      $(dataTag('include')).each(function () {
        var name = $(this).data().templateInclude;
        includes.push(name);
      });

      for (var i=0; i<includes.length; i++) {
        var name = includes[i];
        var viewfile = path.join(settings.root, name + settings.ext);
        debug('including', viewfile);
        var text = yield fs.readFile(viewfile, 'utf8');
        $(dataTag('include', name)).replaceWith(text);
        yield genRender.call(this, viewfile);
        yield isoRender.call(this, viewfile, $, this.state);
      }
      // second: replace all block-placeholders with opts.blocks
      for (var name in opts.blocks) {
        var block = opts.blocks[name];
        var processed = false;
        var $div = $(dataTag('placeholder', name));
        if ($div.length) {
          debug('replacing', name);
          $div.replaceWith(block);
          processed = true;
        } else {
          // if there is no named placeholder try to insert into end of a block with same name
          $div = $(dataTag('block', name));
          if ($div.length) {
            debug('appending', name, 'to block');
            $div.append(block);
            processed = true;
          } else {
            // no placeholder, no block so try to insert into end of default place
            switch (name) {
              case 'head':
                $div = $('head');
                if ($div.length) {
                  debug('appending', name, 'to head');
                  $div.append(block);
                  processed = true;
                }
                break;
              case 'body':
              case 'code':
                $div = $('body');
                if ($div.length) {
                  debug('appending', name, 'to body');
                  $div.append(block);
                  processed = true;
                }
                break;
              default:
                // cannot find the proper place, maybe needed on the higher level
                break;
            }
          }
        }
        if (processed) {
          delete opts.blocks[name];
        } else {
          debug('moving up', name);
        }
      }
      // third: remove all not replaced placeholders
      $(dataTag('placeholder')).each(function () {
        var name = $(this).data().templatePlaceholder;
        debug('removing placeholder', name);
        $(this).remove();
      });
      // fourth: collect constructed blocks
      $(dataTag('block')).each(function () {
        var name = $(this).data().templateBlock;
        debug('storing', name);
        opts.blocks[name] = $(this).html();
      });
      // fifth: check parent template
      var parent = $(dataTag('extend')).first().data();
      view = null;
      if (parent && parent.templateExtend) {
        view = parent.templateExtend;
        debug('extending', view);
      }
    }
    if (this.bundles && this.bundles.length) {
      var $head = $('script[src]').last();
      for (var i=0; i<this.bundles.length; i++) {
        $head.after('\n' + this.bundles[i] + '\n');
      };
    }
    this.$ = $;
    return $;
  }

  function *middleware(next) {
    this.render = render;
    yield next;
    if (this.$) {
      this.body = this.$.html();
      this.type = 'html'; // imply utf-8
    }
  }
};
