const request = require('request');
var logger = require('../log');

// PROD
const appBackendHost = "https://backend.prod.aillia.motherapp.com";
const connectorHost = "https://connector.prod.aillia.motherapp.com";

module.exports = {
    authenticate: function(userName, password, callback) {
        var apiPath = '/api/customer/login';

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
        var apiPath = '/api/customer/status?_locale='+userLocale;

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
        var apiPath = '/api/campaign_category';

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
        var apiPath = '/api/customer/campaign/available?perPage=5&page=1&categoryId[]='+categoryId;

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
        var apiPath = '/api/customer/campaign/available?isFeatured=true&perPage=5&page=1';

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

            var apiResult = JSON.parse(body).result.campaigns;
            var total = JSON.parse(body).total;

            callback(response.statusCode,apiResult,total);
         });
    },
};