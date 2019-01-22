const request = require('request');
var logger = require('../log');

// SIT
//const openLoyaltyHost = "https://backend.sit.aillia.motherapp.com";
//const appBackendHost = "https://app-backend.sit.aillia.motherapp.com";
//const connectorHost = "https://connector.sit.aillia.motherapp.com";
//const ssoHost = "https://sso.sit.aillia.motherapp.com";

// PROD
const openLoyaltyHost = "https://middleware.prod.loyalty.motherapp.com";
const appBackendHost = "https://sso.prod.loyalty.aillia.motherapp.com";
const connectorHost = "https://sso.prod.loyalty.motherapp.com";
const ssoHost = "https://sso.prod.loyalty.motherapp.com";

module.exports = {
    getCampaignCategory: function(userLocale,callback) {
//        var apiPath = '/api/public/campaignCategory?_locale='+userLocale; //SIT
        var apiPath = '/api/campaign_category'; //PROD

        request.get(openLoyaltyHost+apiPath, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));
    //            logger.debug('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).categories;
            callback(apiResult)
         });
     },

    getFeaturedCampaign: function(userLocale,callback) {
//        var apiPath = '/api/campaign/public/available?isFeatured=true&_locale='+userLocale; //SIT
        var apiPath = '/api/customer/campaign/featured'; //PROD

        request.get(openLoyaltyHost+apiPath, (error, response, body) => {
            if(error) {
                logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).campaigns
            var total = JSON.parse(body).total
            callback(apiResult, total)
        });
    },

     getCampaignByCategory: function(userLocale,categoryId, callback) {
//        var apiPath = '/api/campaign/public/available?categoryId[]='+categoryId; //SIT
        var apiPath = '/api/customer/campaign/available?perPage=5&page=1&categoryId[]='+categoryId; //PROD

        request.get(openLoyaltyHost+apiPath, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).campaigns;
            var total = JSON.parse(body).total;
            callback(apiResult, total)
         });
     },

     getExclusiveCampaign: function(userLocale, jwtToken, callback) {
//        var apiPath = '/api/customer/campaign/available?hasSegment=true'; //SIT
        var apiPath = '/api/customer/campaign/exclusive?perPage=5&page=1'; //PROD

        request({
            headers: {
                'Content-type':'application/json',
                'Authorization': 'Bearer '+jwtToken
            },
            uri: openLoyaltyHost+apiPath,
            method: 'GET'
         }, function(error, response, body) {
            if (error) {
                logger.error(error);
                return console.log(error);
            }

            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).campaigns;
            var total = JSON.parse(body).total;

            callback(response.statusCode,apiResult,total);
         });
     },

     authenticate: function(userName, password, callback) {
//        var apiPath = '/api/customer/login'; //SIT
        var apiPath = '/api/token/authenticate'; //PROD

        var requestBody = {
            'username': userName,
            'password': password
        };

        var requestBodyData = JSON.stringify(requestBody);

        request({
            headers: {
                'Content-Type':'application/json',
                'Content-Length':requestBodyData.length
            },
            uri: connectorHost+apiPath,
            body: requestBodyData,
            method: 'POST'
        }, function(error,response,body){
            if (error) {
                logger.error(error);
                return console.log(error);
            }

            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).result;
            callback(response.statusCode,apiResult)
        });
     },

     getCustomerStatus: function(userLocale, jwtToken, callback) {
//        var apiPath = '/api/customer/status?_locale='+userLocale; //SIT
        var apiPath = '/api/customer/status?_locale='+userLocale; //PROD

        request({
            headers: {
                'Content-type': 'application/json',
                'Authorization': 'JWT '+jwtToken
            },
            uri: connectorHost+apiPath,
            method: 'GET'
        }, function(error,response,body) {
            if (error) {
                logger.error(error);
                return console.log(error);
            }

            console.log(JSON.parse(body));

            if (response.statusCode == 200) {
                var apiResult = JSON.parse(body).result;
                callback(response.statusCode,apiResult)
            }
        });
     },

};