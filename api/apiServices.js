const request = require('request');
var logger = require('../log');

var apiHost = "https://backend.sit.aillia.motherapp.com";

module.exports = {
    getFeaturedCampaign: function(callback) {
        request.get(apiHost+"/api/campaign/public/available?isFeatured=true", (error, response, body) => {
            if(error) {
                logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
//            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).campaigns
            callback(apiResult)
        });
    },

    getCampaignCategory: function(userLocale,callback) {
        request.get(apiHost+"/api/public/campaignCategory?_locale="+userLocale, (error, response, body) => {
            if(error) {
               logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
    //            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).categories;
            callback(apiResult)
         });
     },
};