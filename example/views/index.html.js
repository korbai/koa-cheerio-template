// sample for server and client side tool functions (via browserify standalone)

// just demo purpose, server and client, too
var moment = require('moment');

// flag for browserifing and the name of this bundle in the browser, see index.html
exports.iso = 'mybundle';

// callable from server and client side, name should be render
// on the server side called by the renderer automatically
// on the client side you can call mybundle.render($, { data ... })
exports.render = function($, data) {
  var dt = moment().format();
  $('#hello').text(data.name +', at ' + dt + '!');
};
