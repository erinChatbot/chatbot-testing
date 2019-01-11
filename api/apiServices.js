const request = require('request');
var logger = require('../log');

var apiHost = "https://backend.sit.aillia.motherapp.com";

module.exports = {
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

    getFeaturedCampaign: function(userLocale,callback) {
        request.get(apiHost+"/api/campaign/public/available?isFeatured=true&_locale="+userLocale, (error, response, body) => {
            if(error) {
                logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
//            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).campaigns
            var total = JSON.parse(body).total
            callback(apiResult, total)
        });
    },

     getCampaignByCategory: function(userLocale,categoryId, callback) {
        request.get(apiHost+"/api/campaign/public/available?categoryId[]="+categoryId, (error, response, body) => {
            if(error) {
               logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
    //            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).campaigns;
            var total = JSON.parse(body).total
            callback(apiResult, total)
         });
     },
};