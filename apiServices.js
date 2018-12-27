const request = require(‘request’);

module.exports = {
    getFeaturedCampaign: function() {
        request('http://connector.uat.aillia.motherapp.com/api/customer/campaign/featured', { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
        console.log(body.url);
        console.log(body.explanation);
        });
    },
};