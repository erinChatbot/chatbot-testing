var app = require('./app')

module.exports = {
    testfunc: function(recipientId) {
        console.log('test customReply: ' + recipientId)
    }
}

//function testfunc(recipientId) {
//    console.log('testing ' + recipientId)
//}



//function getStartedBtnReply(recipientId) {
//  var msg1 = 'Hi，我係Loyalty chatbot\uD83D\uDC4B'
//  var msg2 = '仲試緊堆API，睇下拎唔拎到野。'
//  app.sendTextMessageWithoutQuickReply(recipientId, msg1)
//  setTimeout(function () {
//    app.sendTextMessageWithoutQuickReply(recipientId, msg2)
//  }, 1000)
//  var messageData = {
//    recipient: {
//      id: recipientId
//    },
//    message: {
//      text: '第一次用？需唔需要教學示範？',
//      quick_replies: [
//        {
//          'content_type': 'text',
//          'title': '好啊',
//          'payload': 'PAYLOAD_FOR_NEED_TUTORIAL'
//        },
//        {
//          'content_type': 'text',
//          'title': '唔洗啦',
//          'payload': 'PAYLOAD_FOR_NO_TUTORIAL'
//        }
//      ]
//    }
//  }
//  setTimeout(function () {
//    app.callSendAPI(messageData)
//  }, 2000)
//}