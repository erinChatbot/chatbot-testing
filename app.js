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
var utils = require('./utils/utils');
var apiService = require('./api/apiServices');
var genericTemplate = require('./models/genericTemplate');
var quickReply = require('./models/quickReplies');
var replyButton = require('./models/replyButton');

var app = express();
app.set('port', process.env.PORT || 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature }));
app.use(express.static('public'));

var userLocale = 'zh_HK'; //tmp, should be store in mongodb
var categoryIdMap = [];
var isTutorial = false;
var tutorialStage = 0;

// FIXME, hardcoded parameter
var loginName = '+85264334904';
var loginPwd = 'Ma123456!';

// store in mongodb
var sso_jwt = "";
var ol_jwt = "";
var ol_refresh_token = "";

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

    // GetStarted
    if (quickReplyPayload == constants.NEED_TUTORIAL){
      showTutorial(senderID);
    }

    if (quickReplyPayload == constants.SKIP_TUTORIAL){
      sendTextMessage(senderID,"好，再需要我就打 /help 搵我\uD83D\uDC4D")
    }

    // Menu
    if (quickReplyPayload == constants.POINT_QUERY){
        pointQuery(senderID);
    }

    if (quickReplyPayload == constants.RECEIVE_OFFER){
        showCampaignCategory(senderID);
    }

    if (quickReplyPayload == constants.SHOW_EXCLUSIVE_CAMPAIGN) {
        pushRegister(senderID);
    }

    if (quickReplyPayload == constants.ABOUT_LOYALTY_CHATBOT){
        aboutLoyaltyChatbot(senderID);
    }

    if (quickReplyPayload == constants.LANGUAGE_SETTING) {
        languageSetting(senderID);
    }

    // Campaign Category response
    if (quickReplyPayload == constants.GET_CAMPAIGN_BY_CATEGORY) {
        showCampaign(senderID, categoryIdMap[messageText]);
     }

    // Language Setting
     if (quickReplyPayload == constants.LANGUAGE_ZH_HK) {
        userLocale = 'zh_HK';
        sendTextMessage(senderID,'好的親');
        setTimeout(function(){
            sendUserMenu(recipientId);
         },1000);
     }

     if (quickReplyPayload == constants.LANGUAGE_EN) {
        userLocale = 'en';
        sendTextMessage(senderID,'OK');
        setTimeout(function(){
            sendUserMenu(recipientId);
        },1000);
     }

     // close campaign category
     if (quickReplyPayload == constants.SHOW_USER_MENU) {
        sendUserMenu(recipientId);
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
  } else if (payload == constants.ABOUT_LOYALTY_CHATBOT) {
    aboutLoyaltyChatbot(senderID);
  } else if (payload == constants.NEED_TUTORIAL) {
    showTutorial(senderID);
  } else if (payload == constants.SIGN_UP_FLOW) {
    signupFlow(senderID);
  } else if (payload == constants.LOGIN) {
    signinFlow(senderID);
  } else if (payload == constants.POINT_QUERY) {
    pointQuery(senderID);
  } else if (payload == constants.RECEIVE_OFFER) {
    showCampaignCategory(senderID);
  } else if (payload == constants.LANGUAGE_SETTING) {
    languageSetting(senderID);
  } else if (payload == constants.SHOW_EXCLUSIVE_CAMPAIGN) {
    pushRegister(senderID);
  } else {
    sendTextMessage(senderID, "做緊，等下啦");
    setTimeout(function(){
       sendUserMenu(recipientId);
    },1000);
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
}

// Send text message with user menu
function sendUserMenu(recipientId) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: "請選擇以下服務:",
            quick_replies : [
                {
                    "content_type":"text",
                    "title":"我有幾多分?",
                    "payload":constants.POINT_QUERY
                },
                {
                    "content_type":"text",
                    "title":"有咩post呢",
                    "payload":constants.RECEIVE_OFFER
                },
                {
                    "content_type":"text",
                    "title":"Only For You",
                    "payload":constants.SHOW_EXCLUSIVE_CAMPAIGN
                },
                {
                    "content_type":"text",
                    "title":"使用教學",
                    "payload":constants.NEED_TUTORIAL
                },
                {
                    "content_type":"text",
                    "title":"語言",
                    "payload":constants.LANGUAGE_SETTING
                },
                {
                    "content_type":"text",
                    "title":"關於Loylaty Chatbot",
                    "payload":constants.ABOUT_LOYALTY_CHATBOT
                }
             ]
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

  var recipientName = ""

  // get user info
  utils.getUserInfo(recipientId, function(apiResult) {
    recipientName = apiResult.first_name;
    userLocale = apiResult.locale;
    var msg1 = 'Hi '+ recipientName +'，我係Loyalty Chatbot\uD83D\uDC4B';
    var msg2 = '依加趕緊demo用';
    sendTextMessage(recipientId, msg1);
    setTimeout(function() {
      sendTextMessage(recipientId, msg2);
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
  });
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

// Tutorial flow
function showTutorial(recipientId) {
    // FIXME
    // handle if user not follow the step
    logger.info('|app: showTutorial| showTutorial');
    isTutorial = true;
    // msg list
    // stage 0
    var msg1 = 'Aillia chatbot可以比你好快咁睇到Aillia有咩campaign同check下account information，好似話比你聽你依加有幾多分咁。';
    var msg2 = '用法好簡單，你可以係下面個menu度揀番想睇既野。';
    var msg3 = '例如我想睇下有咩新既campaign睇，可以㩒一下"有咩post呢"，試下㩒呀親:)';
    // stage 1
    var msg4 = '你可以㩒番你想睇既類型，冇話特別想睇邊一類既可以揀LATEST呀';
    // stage 2
    var msg5 = '就係咁喇！見到有興趣既campaign仲可以㩒入去詳細睇。';
    var msg6 = '跟住我地試下睇帳戶資訊呀！我可以話你聽依加有幾多分。';
    var msg7 = '去menu度揀番"我有幾多分呢?"';
    // stage 3
    var msg8 = '係咪好簡單呢親\u263a\ufe0f';
    var msg9 = '有咩唔明可以隨時打 /help 搵我呀\ud83d\ude03';

    if (tutorialStage == 0) {
        sendTextMessage(recipientId, msg1);
        setTimeout(function() {
           sendTextMessage(recipientId, msg2);
        }, 1000);
        setTimeout(function() {
           sendTextMessage(recipientId, msg3);
           tutorialStage = 1;
        }, 2000);
    } else if (tutorialStage == 1) {
        sendTextMessage(recipientId, msg4);
        tutorialStage = 2;
    } else if (tutorialStage == 2) {
        sendTextMessage(recipientId, msg5);
        setTimeout(function() {
            sendTextMessage(recipientId, msg6);
        }, 1000);
        setTimeout(function() {
            sendTextMessage(recipientId, msg7);
            tutorialStage = 3;
        }, 2000);
    } else if (tutorialStage == 3) {
        sendTextMessage(recipientId, msg8);
        setTimeout(function() {
            sendTextMessage(recipientId, msg9);
            isTutorial = false;
            tutorialStage = 0;
        }, 1000);
        setTimeout(function() {
            sendUserMenu(recipientId);
        },2000);
    }
}

// SignupBtnDidClick
function signupFlow(recipientId) {
    logger.info('Custom Function signupBtnDidClick');
    // FIXME
    // need website doing signup function
    sendTextMessage(recipientId, "要有website先做到:(");
    setTimeout(function(){
        sendUserMenu(recipientId);
    },1000);
}

// SigninBtnDidClick
function signinFlow(recipientId) {
    logger.info('Custom Function signinBtnDidClick');
    // FIXME
    // need website doing signin flow
    sendTextMessage(recipientId, "要有website先做到:(");
    setTimeout(function(){
        sendUserMenu(recipientId);
    },1000);
}

// PointQueryBtnDidClick
function pointQuery(recipientId) {
    logger.info('Custom Function pointQueryBtnDidClick');
    // FIXME: Hardcoded user account
    apiService.authenticate(loginName,loginPwd,function(respCode,apiResult){
        if (respCode == 200) {
            logger.debug('|app: pointQuery| login SUCCESS');

            sso_jwt = apiResult.sso_jwt;
            ol_jwt = apiResult.ol_jwt;
            ol_refresh_token = apiResult.ol_refresh_token;

            console.log('jwt token: '+sso_jwt);

            // Get Customer Status
            apiService.getCustomerStatus(userLocale,sso_jwt,function(respCode,apiResult){
                logger.info('|app: pointQuery| getCustomerStatus SUCCESS');
                if (respCode == 200) {
                    sendTextMessage(recipientId, "你有 "+apiResult.points+" 分");
                    if (isTutorial) {
                        setTimeout(function() {
                            showTutorial(recipientId);
                        }, 1000);
                    } else {
                        setTimeout(function(){
                           sendUserMenu(recipientId);

                        },1000);
                    }
                }
            });
        } else {
            sendTextMessage(recipientId, "login fail");
            setTimeout(function(){
                sendUserMenu(recipientId);
            },1000);
        }
    });
}

// Get Campaign Category
function showCampaignCategory(recipientId) {
    logger.info('custom Function getCampaignCategory');
    apiService.getCampaignCategory(userLocale,function(apiResult) {
        console.log('getCampaignCategory SUCCESS!!');
        categoryIdMap = [];
        var categoryList = [];
        // add latest to category list
        // Quick reply version
        categoryList.push(new quickReply.quickReplies('text','LATEST',constants.GET_CAMPAIGN_BY_CATEGORY));
        categoryIdMap['LATEST'] = '0';
        for(var i=0; i < apiResult.length; i++) {
            var categoryTitle = apiResult[i].name;
            categoryIdMap[categoryTitle] = apiResult[i].campaignCategoryId;
            categoryList.push(new quickReply.quickReplies('text',categoryTitle,constants.GET_CAMPAIGN_BY_CATEGORY));
        }
        // Added close btn at the end
        categoryList.push(new quickReply.quickReplies('text','X',constants.SHOW_USER_MENU));

        // prepare msg
        var messageData = {
            recipient: {
                id: recipientId
            },
            message: {
                text: "想睇咩類型？",
                quick_replies: categoryList
            }
         };

         callSendAPI(messageData);

         if (isTutorial) {
            showTutorial(recipientId);
         }
    });
}

// Get Campaign
function showCampaign(recipientId, categoryId) {
    logger.debug('|app: showCampaign| categoryId: '+categoryId);
    // featured
    if (categoryId == '0') {
        apiService.getFeaturedCampaign(userLocale,function(apiResult, totalCampaign){
            if (totalCampaign != 0) {
                var campaignList = [];
                for(var i=0; i < apiResult.length; i++) {
                    var campaignTitle = apiResult[i].name;
                    var campaignDesc = "無";
                    var imageUrl = "https://www.sylff.org/wp-content/uploads/2016/04/noImage.jpg";
                    if (typeof apiResult[i].photos[0] !== 'undefined' && apiResult[i].photos[0] !== null) {
                        imageUrl = util.format('https://backend.sit.aillia.motherapp.com/api/campaign/%s/photo/%s', apiResult[i].campaignId, apiResult[i].photos[0].photoId.id);
                    }
                    if (typeof apiResult[i].shortDescription !== 'undefined' && apiResult[i].shortDescription !== null) {
                        campaignDesc = apiResult[i].shortDescription
                    }
                    var campaignBtn = [];
                    campaignBtn.push(new genericTemplate.buttons('web_url','無野睇，唔好㩒',imageUrl));
                    campaignList.push(new genericTemplate.elements(campaignTitle,imageUrl,campaignBtn));
                }

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
                   sendTextMessage(recipientId, 'Facebook最多show到10個post，想睇更多就裝番隻app啦親\ud83d\ude09');
                }, 1000);
                setTimeout(function() {
                    if (isTutorial) {
                        showTutorial(recipientId);
                    } else {
                        showCampaignCategory(recipientId);
                    }
                }, 2000);
            }
            else {
                sendTextMessage(recipientId, "無campaign :(");
                setTimeout(function() {
                    if (isTutorial) {
                        showTutorial(recipientId);
                    } else {
                        showCampaignCategory(recipientId);
                    }
                },1000);
            }
        });
    }
    // By category
    else {
        apiService.getCampaignByCategory(userLocale,categoryId,function(apiResult, totalCampaign){
            if (totalCampaign != 0) {
                var campaignList = [];
                for(var i=0; i < apiResult.length; i++) {
                    var campaignTitle = apiResult[i].name;
                    var campaignDesc = "無";
                    var imageUrl = "https://www.sylff.org/wp-content/uploads/2016/04/noImage.jpg";
                    if (typeof apiResult[i].photos[0] !== 'undefined' && apiResult[i].photos[0] !== null) {
                        imageUrl = util.format('https://backend.sit.aillia.motherapp.com/api/campaign/%s/photo/%s', apiResult[i].campaignId, apiResult[i].photos[0].photoId.id);
                    }
                    if (typeof apiResult[i].shortDescription !== 'undefined' && apiResult[i].shortDescription !== null) {
                        campaignDesc = apiResult[i].shortDescription
                    }
                    var campaignBtn = [];
                    campaignBtn.push(new genericTemplate.buttons('web_url','無野睇，唔好㩒',imageUrl));
                    campaignList.push(new genericTemplate.elements(campaignTitle,imageUrl,campaignBtn));
                }

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
                   sendTextMessage(recipientId, 'Facebook最多show到10個post，想睇更多就裝番隻app啦親\ud83d\ude09');
                }, 1000)
                setTimeout(function() {
                    showCampaignCategory(recipientId);
                }, 2000);
            }
            else {
                sendTextMessage(recipientId, "無campaign :(");
                setTimeout(function() {
                    showCampaignCategory(recipientId);
                },1000);
            }
        });
    }
}

// Register only for you push
function pushRegister(recipientId) {
    logger.info('|app: pushRegister| custom function pushRegister');
    // FIXME
    // no "push" api in loyalty backend
    apiService.authenticate(loginName,loginPwd,function(respCode,apiResult){
        if (respCode==200){
            logger.debug('|app: pushRegister| login SUCCESS');

            sso_jwt = apiResult.sso_jwt;
            ol_jwt = apiResult.ol_jwt;
            ol_refresh_token = apiResult.ol_refresh_token;

            console.log('OL jwt token: '+ol_jwt);

            // Get Exclusive campaign
            apiService.getExclusiveCampaign(userLocale, ol_jwt,function(respCode,apiResult,totalCampaign){
                if(respCode==200) {
                    logger.debug('|app: pushRegister| getExclusiveCampaign SUCCESS');

                    if (totalCampaign>0){
                        var campaignList = [];
                        for(var i=0; i<apiResult.length; i++) {
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
                            campaignBtn.push(new genericTemplate.buttons('web_url','無野睇，唔好㩒',imageUrl));
                            campaignList.push(new genericTemplate.elements(campaignTitle,imageUrl,campaignBtn));
                        }
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
                    } else {
                        sendTextMessage(recipientId, "無campaign :(");
                    }
                }
                setTimeout(function(){
                    sendUserMenu(recipientId);
                },1000);
            });
        }
    });
}

// Language Setting
function languageSetting(recipientId) {
    logger.info('|app: languageSetting| custom function languageSetting');
    var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          text: "請選擇語言:",
          quick_replies: [
            {
              "content_type":"text",
              "title":"繁體中文",
              "payload":constants.LANGUAGE_ZH_HK
            },
            {
              "content_type":"text",
              "title":"English",
              "payload":constants.LANGUAGE_EN
            }
          ]
        }
     };
    callSendAPI(messageData);
}

// AboutBtnDidClick
function aboutLoyaltyChatbot(recipientId){
    logger.info('Custom Function AboutBtnDidClick');
    var msg1 = 'Loyalty Chatbot 係由 Erin  開發及設計。如有任何意見，請電郵至 erinfan@motherapp.com 。';
    var msg2 = '你可以用Loyalty Chatbot黎signup，睇有幾多point，睇下有咩offer (好似係)。';
    var msg3 = '玩完就裝番Loyalty隻App啦親\uD83D\uDE4C';
    var msg4 = 'https://hk-issue-manager.motherapp.com/project_ota_links/?project_tag=loyalty';
    sendTextMessage(recipientId,msg1);
    setTimeout(function() {
        sendTextMessage(recipientId,msg2);
    }, 1000)
    setTimeout(function() {
        sendTextMessage(recipientId,msg3);
    }, 2000)
    setTimeout(function() {
        sendTextMessage(recipientId,msg4);
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

