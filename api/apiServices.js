const request = require('request');
var logger = require('../log');
var api = require('.apiPath');

// API Host
const appBackendHost = "https://backend.prod.aillia.motherapp.com";
const connectorHost = "https://connector.prod.aillia.motherapp.com";

// connector: sso jwt
// backend: ol jwt

module.exports = {
    authenticate: function(userName, password, callback) {
        var apiPath = api.AUTHENTICATE;

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

    getCampaignCategory: function(userLocale,callback) {
        var apiPath = '/api/campaign_category';

        request.get(connectorHost+apiPath, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));
            // logger.debug('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).result.categories;
            callback(apiResult)
         });
     },

    getFeaturedCampaign: function(userLocale,callback) {
        var apiPath = '/api/customer/campaign/available?isFeatured=true&perPage=5&page=1';

        request.get(appBackendHost+apiPath, (error, response, body) => {
            if(error) {
                logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).result.campaigns; //PROD
            var total = JSON.parse(body).total
            callback(apiResult, total)
        });
    },

     getCampaignByCategory: function(userLocale,categoryId, callback) {
//        var apiPath = '/api/campaign/public/available?categoryId[]='+categoryId; //SIT
        var apiPath = '/api/customer/campaign/available?perPage=5&page=1&categoryId[]='+categoryId; //PROD

        request.get(appBackendHost+apiPath, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

//            var apiResult = JSON.parse(body).campaigns; //SIT
            var apiResult = JSON.parse(body).result.campaigns;
            var total = JSON.parse(body).total;
            callback(apiResult, total)
         });
     },

     getExclusiveCampaign: function(userLocale, jwtToken, callback) {
//        var apiPath = '/api/customer/campaign/available?hasSegment=true'; //SIT
        var apiPath = '/api/customer/campaign/available?hasSegment=true&perPage=5&page=1'; //PROD

        request({
            headers: {
                'Content-type':'application/json',
//                'Authorization': 'Bearer '+jwtToken //SIT
                'Authorization': 'JWT '+jwtToken
            },
            uri: appBackendHost+apiPath,
            method: 'GET'
         }, function(error, response, body) {
            if (error) {
                logger.error(error);
                return console.log(error);
            }

            console.log(JSON.parse(body));

//            var apiResult = JSON.parse(body).campaigns; //SIT
            var apiResult = JSON.parse(body).result.campaigns; //PROD
            var total = JSON.parse(body).total;

            callback(response.statusCode,apiResult,total);
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
//            uri: connectorHost+apiPath, //SIT
            uri: connectorHost+apiPath, //PROD
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