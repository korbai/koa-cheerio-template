// sample for server and client side tool functions

(function () {

  var mod = function ($, data) {

// just demo purpose, server and client, too
    var mom;
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
      mom = require('moment');
    }
    else {
      mom = moment;
    }

// callable from server and client side, name should be render
// on the server side called by the renderer automatically
// on the client side you can call mybundle.render($, { data ... })
    function Hello(name) {
      var dt = mom().format();
      $('#hello').text(name + ', at ' + dt + '!');
    }

    if (typeof module === 'undefined' || typeof module.exports === 'undefined') {
      // export functions to browser
      window.Hello = Hello;
      return;
    }

    Hello(data.name);

    return true; // ISO, this JS will be included into browser
  };

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = mod;
  }
  else {
    mod($, {});
  }
})();
