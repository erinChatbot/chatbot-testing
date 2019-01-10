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

            var apiResult = JSON.parse(body).result.campaigns //  JSON.parse(body).result.campaigns[1].name
            callback(apiResult)
        });
    },

    getCampaignCategory: function(callback) {
        request.get(apiHost+"/api/public/campaignCategory", (error, response, body) => {
            if(error) {
               logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
    //            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).result.categories;
            callback(apiResult)
         });
     },
};