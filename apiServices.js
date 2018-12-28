const request = require('request');
var logger = require('./log');

module.exports = {
    getFeaturedCampaign: function() {
        request.get("http://connector.uat.aillia.motherapp.com/api/customer/campaign/featured", (error, response, body) => {
            if(error) {
                logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
            logger.info('response body: '+JSON.stringify(body));

            var apiResult = JSON.parse(body).result //  JSON.parse(body).result.campaigns[1].name
            console.log("campaign 0 title: " + JSON.parse(body).result.campaigns[1].name)
//            console.log("BODY RESULT: " + apiResult);

//            for campaign in apiResult {
//                console.log('campaign title: ' + campaign.name)
//            }

            // TODO
            // array to store campaign:
            // 1. name
            // 2. shortDescription
            // return array!!!!!!!!
        });
    },
};