var fs = require('co-fs-extra');
var path = require('path');
var cheerio = require('cheerio');
var debug = require('debug')('template');
//debug = console.log;

// supports div and script tag, too with optional value
function dataTag(name, value) {
  if (value) name += '="' + value + '"';
  return 'div[data-template-' + name + '], script[data-template-' + name + ']';
}

module.exports = function (settings) {
  settings = settings || {};
  settings.root = settings.root || __dirname;
  settings.ext = settings.ext || '.html';
  settings.blocks = settings.blocks || {};

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
      // first: replace all include-placeholders with given contents
      $(dataTag('include')).each(function () {
        var name = $(this).data().templateInclude;
        var viewfile = path.join(settings.root, name + settings.ext);
        debug('including', viewfile);
        var text = fs.readFileSync(viewfile, 'utf8'); // !TODO async
        $(this).replaceWith(text);
      });
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
    this.$ = $;
    return $;
  }

  return function *cheerio(next) {
    this.render = render;
    yield next;
    if (this.$) {
      this.body = this.$.html();
      this.type = 'html'; // imply utf-8
    }
  }
};
