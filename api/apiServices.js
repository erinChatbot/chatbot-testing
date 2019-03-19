const request = require('request');
var logger = require('../log');
var api = require('./apiConfig');

// PROD
const appBackendHost = "https://backend.prod.aillia.motherapp.com";
const connectorHost = "https://connector.prod.aillia.motherapp.com";

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

    getCustomerStatus: function(userLocale, jwtToken, callback) {
        var apiPath = api.GET_CUSTOMER_STATUS + userLocale;

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

    getCampaignCategory: function(userLocale,callback) {
        var apiPath = api.GET_CAMPAIGN_CATEGORY;

        request.get(connectorHost+apiPath, (error, response, body) => {
            if(error) {
               logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).result.categories;
            callback(apiResult)
         });
    },

    getCampaignByCategory: function(userLocale,categoryId, callback) {
        var apiPath = api.GET_CAMPAIGN_BY_CATEGORY + categoryId;

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

    getFeaturedCampaign: function(userLocale,callback) {
        var apiPath = api.GET_FEATURED_CAMPAIGN;

        request.get(appBackendHost+apiPath, (error, response, body) => {
            if(error) {
                logger.error(error);
                return console.log(error);
            }
            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).result.campaigns;
            var total = JSON.parse(body).total
            callback(apiResult, total)
        });
    },

     getExclusiveCampaign: function(userLocale, jwtToken, callback) {
        var apiPath = api.GET_EXCLUSIVE_CAMPAIGN;

        request({
            headers: {
                'Content-type':'application/json',
                'Authorization': 'Bearer '+jwtToken
            },
            uri: appBackendHost+apiPath,
            method: 'GET'
         }, function(error, response, body) {
            if (error) {
                logger.error(error);
                return console.log(error);
            }

            console.log(JSON.parse(body));

            var apiResult = JSON.parse(body).result.campaigns;
            var total = JSON.parse(body).total;

            callback(response.statusCode,apiResult,total);
         });
    },
};