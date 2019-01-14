const querystring = require('querystring');
const request = require('request');
var logger = require('../log');

var appBackendHost = "https://backend.sit.aillia.motherapp.com";
var connectorHost = "https://connector.sit.aillia.motherapp.com";
var ssoHost = "https://sso.sit.aillia.motherapp.com";

module.exports = {
    getCampaignCategory: function(userLocale,callback) {
        request.get(appBackendHost+"/api/public/campaignCategory?_locale="+userLocale, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));
    //            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).categories;
            callback(apiResult)
         });
     },

    getFeaturedCampaign: function(userLocale,callback) {
        request.get(appBackendHost+"/api/campaign/public/available?isFeatured=true&_locale="+userLocale, (error, response, body) => {
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
        request.get(appBackendHost+"/api/campaign/public/available?categoryId[]="+categoryId, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).campaigns;
            var total = JSON.parse(body).total
            callback(apiResult, total)
         });
     },

     authenticate: function(userName, password, callback) {
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
            uri: ssoHost+'/api/token/authenticate',
            body: requestBodyData,
            method: 'POST'
        }, function(error,response,body){
            if (error) {
                logger.error(error);
                return console.log(error);
            }

//            console.log('response body: ' + body);
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).token;
            callback(apiResult)
        });
     },

     getCustomerStatus: function(userLocale, jwtToken, callback) {
        request({
            headers: {
                'Content-type': 'application/json',
                'Authorization': 'JWT '+jwtToken
            },
            uri: connectorHost+'/api/customer/status?_locale='+userLocale,
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