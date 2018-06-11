(function() {
    var matched, browser;

    // Use of jQuery.browser is frowned upon.
    // More details: http://api.jquery.com/jQuery.browser
    // jQuery.uaMatch maintained for back-compat
    jQuery.uaMatch = function( ua ) {
        ua = ua.toLowerCase();

        var match = /(chrome)[ \/]([\w.]+)/.exec( ua ) ||
            /(webkit)[ \/]([\w.]+)/.exec( ua ) ||
            /(opera)(?:.*version|)[ \/]([\w.]+)/.exec( ua ) ||
            /(msie) ([\w.]+)/.exec( ua ) ||
            ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec( ua ) ||
            [];

        return {
            browser: match[ 1 ] || "",
            version: match[ 2 ] || "0"
        };
    };

    matched = jQuery.uaMatch( navigator.userAgent );
    browser = {};

    if ( matched.browser ) {
        browser[ matched.browser ] = true;
        browser.version = matched.version;
    }

    // Chrome is Webkit, but Webkit is also Safari.
    if ( browser.chrome ) {
        browser.webkit = true;
    } else if ( browser.webkit ) {
        browser.safari = true;
    }

    $.fn.findNextAll = function( selector ){
       var that = this[ 0 ],
           selection = $( selector ).get();
       return this.pushStack(
          // if there are no elements in the original selection return everything
          !that && selection ||
          $.grep( selection, function( n ){
             return [4,12,20].indexOf( that.compareDocumentPosition( n ) ) > -1
          // if you are looking for previous elements it should be [2,10,18]
          })
       );
    }
    $.fn.findPrevAll = function( selector ){
       var that = this[ 0 ],
           selection = $( selector ).get();
       return this.pushStack(
          // if there are no elements in the original selection return everything
          !that && selection ||
          $.grep( selection, function( n ){
             return [2,10,18].indexOf( that.compareDocumentPosition( n ) ) > -1
          // if you are looking for previous elements it should be [2,10,18]
          })
       );
    }
    $.fn.findNext = function( selector ){
       return this.pushStack( this.findNextAll( selector ).first() );
    }
    $.fn.findPrev = function( selector ){

       return this.pushStack( this.findPrevAll( selector ).last() );
    }

    jQuery.browser = browser;
})();