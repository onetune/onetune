/**
 * Author: Johannes Choo
 *
 * TODO: refactor methods into files where they belong soonest possible
 */

var db = require('../db/queries');
var cookies = require('cookies');

module.exports = {
  recordReferer: function (referer, current, ip, user_id, callback) {
    var refObj = {
      referer: referer,
      current: current,
      remote_address: ip
    };
    if (user_id) {
      refObj.user = user_id;
    }
    db.insertReferer(refObj, callback);
  },
  /**
   * Record a call to an API (or function, which though possible, you should not use this for)
   * Attributes in the data parameter are recorded,
   * User is recorded,
   * And written to collection, or analytics_access if the collection field is not passed in.
   */
  recordAccess: function (request, response, data, collection, callback) {
    /**
     * request is used to obtain the full path
     * request, response is used to initialize the cookie and obtain user information
     * We do not trust data attached to request;
     * it is the responsibility of the caller to pass interesting data to the data field
     */
    data = data || {};
    data.url = request.url;
    collection = collection || 'analytics_access';
    var afterUser = function (user) {
      data.user = user && user._id;
      return db.insertAccess(data, collection, callback);
    };
    if (!data.user || !data.user._id) {
      var cookie = new cookies(request, response);
      var token = cookie.get('token');
      db.getUser(token, afterUser);    
    } else {
      afterUser(data.user);
    }

  },
  recordVote: function (user_id, url, vote, callback) {
    var data = {
      user: user_id,
      url: url,
      vote: vote,
    };
    db.insertVote(data, callback);
  }
};
