const request = require(‘request’);
var apiHelper = require('./apiHelper');

module.exports = {
    getFeaturedCampaign: function() {
        request(apiHelper.GET_FEATURED_CAMPAIGN, { json: true }, (err, res, body) => {
        if (err) { return console.log(err); }
        console.log(body.url);
        console.log(body.explanation);
        });
    },
};