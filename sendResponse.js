var app = require('./app');
var logger = require('./log');

var sendResponse = {
    sendGetStartedMsg: function(recipientId) {
        logger.info('sendResponse | sendGetStartedMsg')
//        var msg1 = 'Hi，我係Loyalty Chatbot\uD83D\uDC4B';
//        var msg2 = '我試緊堆APIsss';
//        app.sendTextMessageWithoutQuickReply(recipientId, msg1);
//        setTimeout(function() {
//            app.sendTextMessageWithoutQuickReply(recipientId, msg2);
//         }, 1000)
//        var messageData = {
//            recipient: {
//                id: recipientId
//            }
//            message: {
//                text: "第一次用？需唔需要教學示範？",
//                quick_replies: [
//                    {
//                        "content_type":"text",
//                        "title":"好啊",
//                        "payload":"PAYLOAD_FOR_NEED_TUTORIAL"
//                    },
//                    {
//                        "content_type":"text",
//                        "title":"唔洗啦",
//                        "payload":"PAYLOAD_FOR_NO_TUTORIAL"
//                    }
//                ]
//            }
//        };
//        setTimeout(function() {
//            app.callSendAPI(messageData);
//        }, 2000)
    }
};

module.exports = sendResponse