'use strict';

let apiHelper = {
    // Host
    HOST : 'connector.uat.aillia.motherapp.com/api',
    // Get Featured Campaign
    GET_FEATURED_CAMPAIGN: 'http://connector.uat.aillia.motherapp.com/api/customer/campaign/featured',

}

module.exports = Object.freeze(apiHelper);

//var Request = require("request");
//
//Request.post({
//    "headers": { "content-type": "application/json" },
//    "url": "http://connector.uat.aillia.motherapp.com",
//    "body": JSON.stringify({
//        "firstname": "Nic",
//        "lastname": "Raboy"
//    })
//}, (error, response, body) => {
//    if(error) {
//        return console.dir(error);
//    }
//    console.dir(JSON.parse(body));
//});

// connector.uat.aillia.motherapp.com

//const request = require('request');
//
//const options = {
//    url: 'connector.uat.aillia.motherapp.com',
//    headers: {
//        'User-Agent': 'request'
//    }
//};
//
//function callback(error, response, body) {
//    if (!error && response.statusCode == 200) {
//        const info = JSON.parse(body);
//        console.log(info.stargazers_count + "Stars");
//        console.log(info.forks_count + "Forks");
//    }
//}