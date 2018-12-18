var logger = require('./log');
var sendResponse = require('./sendResponse');

var customReply = {
    // Get Started Btn DidClick
        getStartedBtnReply: function(recipientId) {
            sendResponse.sendGetStartedMsg(recipientId)
        }
};

module.exports = customReply
