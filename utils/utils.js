const request = require('request');
const config = require('config');
var logger = require('../log');

const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

var facebookApi = "https://graph.facebook.com/v2.6/";

module.exports = {
    getUserLocale: function(userId, callback) {
        request.get(facebookApi+userId+"?fields=locale&access_token="+PAGE_ACCESS_TOKEN, (error, response, body) => {
            if(error) {
                logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
            logger.debug('|utils: getUserLocale|: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).locale
            callback(apiResult)
        });
    }
}