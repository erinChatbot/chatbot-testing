'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request'),
  util = require('util');

var logger = require('./log');
var constants = require('./constants');
var apiService = require('./apiServices');
var campaign = require('./models/campaign');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Use your own validation token. Check that the token used in the Webhook
 * setup is the same token used here.
 *
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VALIDATION_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});

/*
 * All callbacks for Messenger are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks
 * for your page.
 * https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app
 *
 */
app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object == 'page') {
    // Iterate over each entry
    // There may be multiple if batched
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      // Iterate over each messaging event
      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else if (messagingEvent.read) {
          receivedMessageRead(messagingEvent);
        } else if (messagingEvent.account_linking) {
          receivedAccountLink(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });
    res.sendStatus(200); // You must send back a 200, within 20 seconds. Otherwise, the request will time out.
  }
});

/*
 * This path is used for account linking. The account linking call-to-action
 * (sendAccountLinking) is pointed to this URL.
 *
 */
app.get('/authorize', function(req, res) {
  var accountLinkingToken = req.query.account_linking_token;
  var redirectURI = req.query.redirect_uri;

  // Authorization Code should be generated per user by the developer. This will
  // be passed to the Account Linking callback.
  var authCode = "1234567890";

  // Redirect users to this URI on successful login
  var redirectURISuccess = redirectURI + "&authorization_code=" + authCode;

  res.render('authorize', {
    accountLinkingToken: accountLinkingToken,
    redirectURI: redirectURI,
    redirectURISuccess: redirectURISuccess
  });
});

/************ FUNCTION ***************/

// Verify that the callback came from Facebook.
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

// Authorization Event
function receivedAuthentication(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfAuth = event.timestamp;

  var passThroughParam = event.optin.ref;

  console.log("Received authentication for user %d and page %d with pass " +
    "through param '%s' at %d", senderID, recipientID, passThroughParam,
    timeOfAuth);

  sendTextMessage(senderID, "Authentication successful");
}

// Handle message event
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var isEcho = message.is_echo;
  var messageId = message.mid;
  var appId = message.app_id;
  var metadata = message.metadata;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;
  var quickReply = message.quick_reply;

  if (isEcho) {
    // Just logging message echoes to console
    console.log("Received echo for message %s and app %d with metadata %s",
      messageId, appId, metadata);
    return;
  } else if (quickReply) {
    var quickReplyPayload = quickReply.payload;
    console.log("Quick reply for message %s with payload %s",
      messageId, quickReplyPayload);

    if (quickReplyPayload == constants.NEED_TUTORIAL){
      sendTextMessage(senderID,"未做好，你遲d再㩒過啦")
    }

    if (quickReplyPayload == constants.SKIP_TUTORIAL){
      sendTextMessage(senderID,"好，再需要我就打 /help 搵我\uD83D\uDC4D")
    }

    if (quickReplyPayload == constants.SIGN_UP_FLOW){
        sendTextMessage(senderID,"未做好，你遲d再㩒過啦")
    }

    if (quickReplyPayload == constants.POINT_QUERY){
        sendTextMessage(senderID,"未做好，你遲d再㩒過啦")
    }

    if (quickReplyPayload == constants.RECEIVE_OFFER){
        sendTextMessage(senderID,"未做好，你遲d再㩒過啦")
    }

    if (quickReplyPayload == constants.ABOUT_LOYALTY_CHATBOT){
        aboutLoyaltyChatbot(senderID);
    }

    //sendTextMessage(senderID, "Quick reply tapped");
    return;
  }

  if (messageText) {
    // If we receive a text message, check to see if it matches any special
    switch (messageText) {
      case '/help':
        showHelpMsg(senderID);
        break;

      default:
        sendTextMessage(senderID,'已訂閱 '+messageText+'。');
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}

// Postback Event
function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;
  var response_text = 'default response';

  var payload = event.postback.payload;

  logger.info('receivedPostback Payload: ' + payload);

  // Custom Define Payload list
  if (payload == constants.GET_STARTED){
    getStartedBtnReply(senderID);
  } else if (payload == constants.SHOW_INDEX) {
    showHomeIndex(senderID);
  } else if (payload == constants.ABOUT_LOYALTY_CHATBOT) {
    aboutLoyaltyChatbot(senderID);
  } else if (payload == constants.SHOW_TUTORIAL) {
    console.log('showTutorial()');
  } else if (payload == constants.SIGN_UP_FLOW) {
    signupFlow(senderID);
  } else if (payload == constants.LOGIN) {
    signinFlow(senderID);
  } else if (payload == constants.POINT_QUERY) {
    pointQuery(senderID);
  } else if (payload == constants.RECEIVE_OFFER) {
    campaignOffer(senderID);
  }else {
    sendTextMessage(senderID, "做緊，等下啦");
  }
  //sendTextMessage(senderID, response_text);
}

// Message Read Event
function receivedMessageRead(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  // All messages before watermark (a timestamp) or sequence have been seen.
  var watermark = event.read.watermark;
  var sequenceNumber = event.read.seq;

  console.log("Received message read event for watermark %d and sequence " +
    "number %d", watermark, sequenceNumber);
}

// Send a text message using the Send API.
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
//  setTimeout(function() {
//    sendQuickReply(recipientId);
//  }, 2000)
}

// Send a message with Quick Reply buttons.
function sendQuickReply(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "請選擇以下服務：",
      quick_replies: [
        {
          "content_type":"text",
          "title":"試SignUp flow",
          "payload":"PAYLOAD_FOR_SIGN_UP_FLOW"
        },
        {
          "content_type":"text",
          "title":"睇下有幾多point",
          "payload":"PAYLOAD_FOR_POINT_QUERY"
        },
        {
          "content_type":"text",
          "title":"睇有咩offer",
          "payload":"PAYLOAD_FOR_RECEIVE_OFFER"
        },
        {
          "content_type":"text",
          "title":"關於Loyalty Chatbot",
          "payload":"PAYLOAD_FOR_ABOUT_LOYALTY_CHATBOT"
        }
      ]
    }
  };

  callSendAPI(messageData);
}

// sendTextMessageWithoutQuickReply
function sendTextMessageWithoutQuickReply(recipientId, messageText) {
      var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          text: messageText,
          metadata: "DEVELOPER_DEFINED_METADATA"
        }
      };

      callSendAPI(messageData);
    }

// Call the Send API
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

// Send a read receipt to indicate the message has been read
function sendReadReceipt(recipientId) {
  console.log("Sending a read receipt to mark message as seen");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "mark_seen"
  };

  callSendAPI(messageData);
}

// Turn typing indicator on
function sendTypingOn(recipientId) {
  console.log("Turning typing indicator on");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_on"
  };

  callSendAPI(messageData);
}

// Turn typing indicator off
function sendTypingOff(recipientId) {
  console.log("Turning typing indicator off");

  var messageData = {
    recipient: {
      id: recipientId
    },
    sender_action: "typing_off"
  };

  callSendAPI(messageData);
}

// Delivery Confirmation Event
function receivedDeliveryConfirmation(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var delivery = event.delivery;
  var messageIDs = delivery.mids;
  var watermark = delivery.watermark;
  var sequenceNumber = delivery.seq;

  if (messageIDs) {
    messageIDs.forEach(function(messageID) {
      console.log("Received delivery confirmation for message ID: %s",
        messageID);
    });
  }

  console.log("All message before %d were delivered.", watermark);
}

// Account Link Event
function receivedAccountLink(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;

  var status = event.account_linking.status;
  var authCode = event.account_linking.authorization_code;

  console.log("Received account link event with for user %d with status %s " +
    "and auth code %s ", senderID, status, authCode);
}

// Send a message with the account linking call-to-action
function sendAccountLinking(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "button",
          text: "Welcome. Link your account.",
          buttons:[{
            type: "account_link",
            url: SERVER_URL + "/authorize"
          }]
        }
      }
    }
  };

  callSendAPI(messageData);
}

/*************** CUSTOM REPLY FUNCTION *****************/
// GetStartedBtnDidClick
function getStartedBtnReply(recipientId){
  logger.info('Custom Function GetStartedBtnDidClick');
  var msg1 = 'Hi，我係Loyalty Chatbot\uD83D\uDC4B';
  var msg2 = '我試緊堆APIsss';
  sendTextMessageWithoutQuickReply(recipientId, msg1);
  setTimeout(function() {
    sendTextMessageWithoutQuickReply(recipientId, msg2);
  }, 1000)
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "第一次用？需唔需要教學示範？",
      quick_replies: [
        {
          "content_type":"text",
          "title":"好啊",
          "payload":constants.NEED_TUTORIAL
        },
        {
          "content_type":"text",
          "title":"唔洗啦",
          "payload":constants.SKIP_TUTORIAL
        }
      ]
    }
  };
  setTimeout(function() {
    callSendAPI(messageData);
  }, 2000)
  //callSendAPI(messageData);
}

// ShowHelpMsg
function showHelpMsg(recipientId) {
    logger.info('Custom Function show helping msg')
    var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          text: "親，有咩幫到你？",
          quick_replies: [
            {
              "content_type":"text",
              "title":"睇教學",
              "payload":constants.NEED_TUTORIAL
            },
            {
              "content_type":"text",
              "title":"無野喇",
              "payload":constants.SKIP_TUTORIAL
            }
          ]
        }
     };
    callSendAPI(messageData);
}

// ShowIndexBtnDidClick
function showHomeIndex(recipientId) {
    logger.info('Custom Function ShowIndexBtnDidClick');
    var messageData = {
        recipient: {
              id: recipientId
        },
        message: {
            "attachment" : {
                "type" : "template",
                "payload" : {
                    "template_type":"generic",
                    "elements" : [
                        {
                            "title" : "無AC?",
                            "image_url" : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSV_R-tRYomkbTxY1APlniAfChGVHLy8O6mwUlPE3hTcfTAS2nNvA",
                            //https://www.paidmembershipspro.com/wp-content/uploads/2016/06/signup-300x300.png
                            "buttons":[
                                {
                                    "type" : "postback",
                                    "title": "Sign up now!",
                                    "payload": constants.SIGN_UP_FLOW
                                }
                            ]
                        },
                        {
                            "title" : "我有AC!",
                            "image_url" : "http://www.odoo.com/apps/icon_image?module_id=43237",
                            "buttons":[
                                {
                                    "type" : "postback",
                                    "title": "Login先!",
                                    "payload": constants.LOGIN
                                }
                            ]
                        },
                        {
                            "title" : "我有幾多分",
                            "image_url" : "https://marketplace.magento.com/media/catalog/product/cache/0f831c1845fc143d00d6d1ebc49f446a/r/e/reward-points_1.png",
                            "buttons":[
                                {
                                    "type" : "postback",
                                    "title": "Query point!",
                                    "payload": constants.POINT_QUERY
                                }
                            ]
                        },
                        {
                            "title" : "有咩offer?",
                            "image_url" : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRfKbNv7zt0d6K9rNP_aiP8adunzmeAE6jg1Knr_4iHKbAYj1WKXg",
                            // https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPHVwfgdMrZlhnp_2Z_Gvp9uG1z9bvC9VlO9dliGse1oWvx8gm
                            "buttons":[
                                {
                                    "type" : "postback",
                                    "title": "Receive Offer!",
                                    "payload": constants.RECEIVE_OFFER
                                }
                            ]
                        },
                    ]
                }
            }
        }
    };
    callSendAPI(messageData);
}

// SignupBtnDidClick
function signupFlow(recipientId) {
    logger.info('Custom Function signupBtnDidClick');
    // FIXME
    // need website doing signup function
    sendTextMessage(recipientId, "要有website先做到:(");
}

// SigninBtnDidClick
function signinFlow(recipientId) {
    logger.info('Custom Function signinBtnDidClick');
    // FIXME
    // need website doing signin flow
    sendTextMessage(recipientId, "要有website先做到:(");
}

// PointQueryBtnDidClick
function pointQuery(recipientId) {
    logger.info('Custom Function pointQueryBtnDidClick');
    // FIXME
    // need JWT token!
    sendTextMessage(recipientId, "要login左有JWT token先得");
}

// Check offer
function campaignOffer(recipientId) {
    logger.info('custom Function campaignOffer');
    apiService.getFeaturedCampaign(function(apiResult){
        var campaignList = [];
        for(var i=0; i < apiResult.length; i++) {
            var campaignTitle = apiResult[i].name;
            var campaignDesc = "無";
            var imageUrl = "https://www.sylff.org/wp-content/uploads/2016/04/noImage.jpg";
            if (typeof apiResult[i].photos[0] !== 'undefined' && apiResult[i].photos[0] !== null) {
                imageUrl = util.format('https://connector.uat.aillia.motherapp.com/api/campaign/%s/photo/%s', apiResult[i].campaignId, apiResult[i].photos[0].photoId.id);
            }
            if (typeof apiResult[i].shortDescription !== 'undefined' && apiResult[i].shortDescription !== null) {
                campaignDesc = apiResult[i].shortDescription
            }
            var campaignBtn = [];
            campaignBtn.push(new campaign.BtnContent('web_url','Redeem now!',imageUrl));
            campaignList.push(new campaign.Campaign(campaignTitle,imageUrl,campaignBtn));
        }

        // debug use
//        for (var n=0; n < campaignList.length; n++) {
//            sendTextMessage(recipientId, "第"+n+"個campaign title係：\n"+campaignList[n].title+"\n\nshort description:\n"+campaignList[n].desc+"\n\nimage url:\n"+icampaignList[n].image);
//        }

        // prepare msg
        var messageData = {
           recipient: {
              id: recipientId
           },
           message: {
              "attachment" : {
                 "type" : "template",
                 "payload" : {
                    "template_type":"generic",
                    "elements" : campaignList
                 }
              }
           }
        };
        console.log(JSON.stringify(messageData));
        callSendAPI(messageData);
        setTimeout(function() {
           sendTextMessage(recipientId, "Facebook最多show到10個post(好似係)。\n想睇多d？用App睇啦親");
        }, 2000)
    });
}

// AboutBtnDidClick
function aboutLoyaltyChatbot(recipientId){
    logger.info('Custom Function AboutBtnDidClick');
    var msg1 = 'Loyalty Chatbot 係由 Erin  開發及設計。如有任何意見，請電郵至 erinfan@motherapp.com 。';
    var msg2 = '你可以用Loyalty Chatbot黎signup，睇有幾多point，睇下有咩offer (好似係)。';
    var msg3 = '玩完就裝番Loyalty隻App啦親\uD83D\uDE4C';
    var msg4 = 'https://hk-issue-manager.motherapp.com/project_ota_links/?project_tag=loyalty';
    sendTextMessageWithoutQuickReply(recipientId,msg1);
    setTimeout(function() {
        sendTextMessageWithoutQuickReply(recipientId,msg2);
    }, 1000)
    setTimeout(function() {
        sendTextMessageWithoutQuickReply(recipientId,msg3);
    }, 2000)
    setTimeout(function() {
        sendTextMessageWithoutQuickReply(recipientId,msg4);
    }, 3000)
}

/****************** START SERVER *********************/
// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

