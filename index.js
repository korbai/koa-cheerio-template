var fs = require('co-fs-extra');
var path = require('path');
var cheerio = require('cheerio');
var browserify = require('browserify');
var compose = require('koa-compose');
var debug = require('debug')('template');
//debug = console.log;

// supports div and script tag, too with optional value
function dataTag(name, value) {
  if (value) name += '="' + value + '"';
  return 'div[data-template-' + name + '], script[data-template-' + name + ']';
}

module.exports = function (settings) {
  var isorenders = {};
  settings = settings || {};
  settings.root = settings.root || __dirname;
  settings.ext = settings.ext || '.html';

  var middlewares = [];
  if (settings.bundles) {
    // isomorphic support ON
    middlewares.push(require('koa-static')(settings.bundles));
  }
  middlewares.push(middleware);
  return compose(middlewares);

  function *isorender(viewfile, $, data) {
    var js = viewfile + '.js';
    var iso = js.substr(settings.root.length);
    var r = isorenders[js];
    if (!r) {
      if (yield fs.exists(js)) {
        r = require(js);
        debug('registering iso render', js);

        if (settings.bundles && r.iso) {
          debug('registering iso bundle', iso, 'as', r.iso);
          yield fs.ensureFile(path.join(settings.bundles, iso));
          var b = browserify({
            standalone: r.iso
          });
          b.add(js);
          b.bundle(function (err, buf) {
            var p = path.join(settings.bundles, iso);
            fs.writeFile(p, buf);
          });
        }
      } else {
        // not to check again and again file exist
        // so registering an empty stub
        r = {};
      }
      isorenders[js] = r;
    }
    if (r && r.render) {
      r.render($, data);

      if (r.iso) {
        var script = '<script src="/' + iso + '"></script>';
        this.bundles = this.bundles || [];
        this.bundles.push(script);
      }
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
      $ = cheerio.load(text, opts);
      if (settings.bundles) {
        yield isorender.call(this, viewfile, $, this.data);
      }
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
        if (settings.bundles) {
          yield isorender.call(this, viewfile, $, this.data);
        }
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
      var $head = $('head');
      for (var i=0; i<this.bundles.length; i++) {
        $head.append(this.bundles[i] + '\n');
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
