const request = require('request');
var logger = require('./log');

module.exports = {
    getFeaturedCampaign: function() {
//        request('http://connector.uat.aillia.motherapp.com/api/customer/campaign/featured', { json: true }, (err, res, body) => {
//        if (err) {
//            logger.error(err)
//            return console.log(err);
//        }
//
//        logger.info('request url: '+body.url);
//        logger.info('request explanation: '+body.explanation);
//        console.log(body.url);
//        console.log(body.explanation);
//        });
        Request.get("http://connector.uat.aillia.motherapp.com/api/customer/campaign/featured", (error, response, body) => {
            if(error) {
                logger.error(err);
                return console.log(error);
            }
            console.log(JSON.parse(body));
            logger.info('response body: '+JSON.parse(body));
        });
    },
};