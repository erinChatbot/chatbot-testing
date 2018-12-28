'use strict';

const
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),
  request = require('request');

var logger = require('./log');
var constants = require('./constants');
var apiService = require('./apiServices');

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
                            "image_url" : "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBUQEBAVFRUVDxAXFRUVFRUXFRUWFRUWGBUVFRcYHSggGBolHRcVITEhJikrLjAuFx8zODMsNygtLisBCgoKDg0OGhAQGzAjICY3LzYrNystLSstLTEtNS0tNy4tKy0rKy0rLS8tKy0tNzcvLS8tKy0rNDIwLy0vLS0tNf/AABEIAKsBJwMBIgACEQEDEQH/xAAbAAABBQEBAAAAAAAAAAAAAAAAAQIEBQYHA//EAD8QAAEDAgMECAELBAICAwAAAAEAAgMEEQUSIQYxUWETIjJBcYGRoUIHFCMzUmKSorHB0UNyc4Lh8BWTNNLx/8QAGgEBAAIDAQAAAAAAAAAAAAAAAAIEAQMFBv/EAC4RAAIBAgQEBQQCAwAAAAAAAAABAgMRBBIxUQUhQXETFDJhoSKRwfBC0YGx4f/aAAwDAQACEQMRAD8A7EhCEBUSY9HfK1rnO4EtB/BcyfkU6hqHSMzOYWG50IcNO49drT7Be7GBos0ADgBYeyVACF5T1MbBd72t8SAqqq2ppI/6mY8Gi/ugLpQ3kdI5nFodb2P7LKYht3YEQxebz+wVFs5tHM/EWumfm6X6I8ADctsP7g31QGhwyf5lXyQn6ucGRo+9e0gHnZ3+5Wjqcap4+0/2Kp9rsKfMxskLSZY3hzLd/c5vmCR6cFCfgNVOAS0M0F87tR5NugJ1VtpA3sMc70AVNV7cTH6tjW+NyVPp9hW75ZyeTGge5v8AorWm2Uoo/wCjmPF7i723eyAwNXtFUydqZ3gDlHsq19QTvJPiV2FmHQNFmwRgcBGwD9FgflA2WZGBUwNs0kCRgvlF9zmt3AdxHhzQFVgOGvrJTFG4DK3M9x+Ft7bhvN+5bii2LpmfWF8h5nK30br7rMfJk/oqlzHCwliLR3atcCP+810shARaXDYIvq4WN5hov671KQhACi0la2R0jLFronhrmnfYi7Hji1w3HkRvBUpVOLwujeyriaXOYMkrGgl0kLjqABvcw9Yf7D4kBaoQhAC85og4WPkvRCApXtINjvCarGvguMw3jfzCrbrAAryqGZhZeiQoCmiqDTyZ9cpsJGjh9sDiPceAWuoqoEb7tcBu9iFnayC+oXjg9Z0T+id2HHqH7Lj8Hge7np3hZBsnNskXnTTAjKfI8OXgvQiyAEJEjnAak28UAqFV1m0NJF2pm34N6x9lR1m3kQ0iic7m45QgNghczq9tKt/ZLWD7oufUoQHRKnF6ePtzMHK9z6BVFVtpTN7Ac/wFh7rK0+zFbJ/SyjjI4N9t/srSn2DkP1lQ0cmNLvckIBlXt1Kfq42t5m5KpqvaWqk3zOA4N6v6K/rNgRkJinJeBoHtAaTwuN3jqudzula4scA0tcQ4HUgg2IQFzTsmqH5WNfI7gLk+JPcOZWgo9ial+sjmRjhfO70Gnurf5NGt+Ylw1cZ5A86XNg3KPCx9ytWgMrTbC0w+sfJJyuGN9tfdW9Ds/RwEOjp4w4G4cRmcDxDnXIKskIBssgaC5xsB3lNp6hkjc8b2vab9ZpBGm/UL0WaowKXEHU7C5rKkSVBzNuHS3s9sbgRlsBmIN94tZAaVCEiAVeVRCHtLHC4IsV6IQGH2op/m/Q1LAB0UpY+2nUksCfJzY/IlbKhqxNE2Ud4sfFV20NEJIntIu17SCPL+P2Wb+T3EzG99HKdWuy3Pf9h3mLe6A3aEEIQAhCRAecVQxxc1rgSwgPAOrSRcBw7tNV6KHXYeJCJGuMcrRZsjd4H2XDc9h+yfEWOqdQyyuBbNHlc0gZmm7H/eZ3jmDu570BKQhCAFU10GR1xuPseCtlDxaZjIXOeQABe5491kBWJCkQsARyrK6mBB00KsimSNuEAmCYiXfRSHrtGhPxt+14jS/ke9SsSxl8TdLG266z1bCQQQSCDdrhvB4j/veQqvFsXlIyua0niCW38rG3qsgk1+11Ubhrg3+1ov7qgq8RmlP0krneLjb0VdPUSE/CPU/wAKMWOdvc4+dvYWWbAmSTtbvcByvr6LxdWj4Wk+w99fZFPhzz2WegVnT7PSnfogKh1RId1h6n+ELUQbOMHaJKEB1tCELABYvG9kmz1T5AbBwa4jnuJ9gtootY7K5j+7MGnwfoPzZUBVbN0jKSR1KPji6Zt+8scGPt5OZ6q+VHtBJ0L6er7oqgMk/wAVRaN35+iPkr1wsbIBEIQgBePzZnSdLlu8Nygkk5Qd4aDo29he2+wvuXsmSszNIzFtxvba48LgoB6RZuilfTYi6mkke+OoiEkBkeXZXxi0kYLjw61lpEAIQhANlYHAg965ptVTOpp2VTRbKQ2S32SdD5E+jiumqj2mw9srCCLhzSCOOn8X9EBZYXWiohbKN9gHePFSVz3YLFTTyPpJTuNte9vwu9Pe66EXDeCCON0AIUSpxOCPtysHmL+ipqzbSlZ2MzzyFh6lZsLmkQuf1m3Ux+rjazmesVQ1u0FTL25nW4A2HoFnKyOZHU6rE4IvrJWt5Ei/oqSs21pmdgOeeQsPUrnDc79wJ5/8r2ZQSHfZvnc+y3U8POfpTZqnXhD1NI0Vft3O7SNjWc+0f4WQxbG5ZJGPnkc8NkY4tvpYEEgDcrRmFs+JxPsF7x0UTdRG243Ei5B4gnUK5DhlV62RVnxGmtLs3BSLI5ze9zfjc3VxhWIl30bzr8J48jzUMRw2dKGZO+5Khj41JZWrFoUhQSmkrml88qiIOCoKzBnPOhC0RTSsgzMWzTfidfwU+DBoWfCPPVWhTSgPFsLRuCCE8lMJQDShISkQG9QhCAF4VkOeNzN12kA8D3H1XukQFZWU4q6R0btOlhc023tLhY25tP6Jdmq91RRxSvsJA3o5QDfLLESyRvk5pXpSdV8kfB2dv9slyfzB/qq/A/oayqpvhkyVUe613dSZo/2bnP8AkQF8hCEAIQkQFHtHhk1Q6ExZGOhmZI2Vzjpa4czIBqCOYV4vCproo9ZJGt8SFS1m2NKzskvP3Rp6lLA0KFgqzbuQ6RRNbzdqVQ1u0dVL2pnAcG9UeyllZHMjqFbicEIvJK1vInX0WTqNsYp6uGniHUMhzPdpclrg0AcyQsI97nnS7j5kpKbDJjKx5GQNlicTcXs17XGw46d62woTn6U2a51ox9TsaXa+hdDM2pjGre1bvZe59Dr5le9XiGeIEHe0d6lYrizZhlEdhxJ19AqWKnYzRosOGpHkDoPJWqXDa0vVZfvsVqnEKS05ldI5zj1QT4aobQyHfYeJ/hWyFfhwyC9Tv8FKfEZv0q3yQGYY34nE+Gikx0sbdzB56n3XqhW4YalDSKKs8RVnrIVIhaLY6ePO6JzWZ3tJikc0OLXgbte7v8jxU61Tw4OVr2I0oZ5qN7XKemw6aUXjicRbtWs38R091YxYO1lK6ecSDM28bmlhbr2A4HranysQpNC6qq6r5vUTOs0u6RgOUFrTq2zbAg3A8Cp2MY5F88jic0OhjJa/hmc0tLrfdBt5u5KnUrVXNQXd227+/YtQpU1FyfZX37e3cxqAVPxzDTTTGPe09Zh4tO7+PJV6vxlGcVJaMpSi4yaeqNDh9X0jde0NHfz5qTdZqlqDG4OHmOI7wtCyQOAIOhGi83jsL4M7r0vT+jv4PEeLCz1Wv9jyUwpSU0lUi4IUwlOJTCgEJXmSnEphKAaShNcUIDoCRKkQAheNRVxxi73tb4kBUOI7Z00QOS8h5aD1KAnYjUCKqgv/AFekiPjbO0+rbf7KBtQ8wSU9a3+lN0b/APFPZp/OIj6rne0G1U0svzh+ghtIxje7o3B9uZOWy61idGypgfC7syRuabb7OG8c+9APlxaADMX2BHfdVVXtfSs3ZnHkP5WNjrHhnzecjpozlI+3bQPYO9p3+dt6rK9r2DM5jw3iWOt62WQaqs27edIog3m43PoqKs2lqpe1MQODeqPZZx9bfc0n2/VPog+WQNNmg3vbU2AvoVOEMzSXU1zllTbJbpi46kk+pXsykkPdbx09t6s4o2tFmgD/AL3nvTl2afDF/N/Y5NTiD/gvuQGYb9p3p/JXuyijHw38df8AhSEK7DCUYaR+/MqzxNWWsvwAFtAhCFYK4JEIQAhCEAIQhZAJ0chaQ5psQQQR3EagpqEFzUVlTRz5Kl874pHR5ZWRg5nEab9wB57xZQf/ACNFF9TSZz9qd1/yDT9FWVNFLG1rpI3ND75Se/d/IU/C8F+cQSSMkvJH/TtvG8a379bcwqXh0oQu5PL35fH5LXiVJysoq/bn8/gj4pi8tTl6TKA2+VrWgBoPcO+2g0v3KArXBsCkqgXNexrWus4k6jS98vBSqfA6ee7KaqzSAEhr2Fodb7J//Vs8ajS+lcra2T5d9iHhVan1Prpd69igU7C6rKch3E6cjw81DljLXFrhYgkEHuI3hNU61GNam4shRqypTUkaUlNJUTD6rO2x7Q38+BUkleVqU5U5OMtUelpzU4qUdGBKYSlJTCVAmISmOKUlMcUA1xQmuKEBNrNuT/SiA5uN/YKjrNp6qTfKWjg3T9FZ0mwk7tZZmM5NBef2Cu6PYmjZq8PkP3nWHoy3vdAc6kqHOOpLifEkqbTbOVs3Yp3AcX9QfmsfRdUpKGGEWiiYz+1oHqRvUhAc1i+TKSQEVFQ1rSLObG0uJB3jMbW05FdHZGAAOAT0IBjYmg3DQDxAAPqnHXQoSoDm20exx+ckwNAY8Zrbg036wHLv815s2X+bt6aR4Fi0Dm55DGjzJAXRKxu532Tr4HQ/sfJVO1FI6WjmZGOv0eeP/JGQ+P8AM0KcJuMlJdCE4qUWtzGJEMnbK1srOzIxr2+DhdC9dCSlFNHmJRcW0wQkQskQQhCAEIurqDZ12QSTzRwNd2c56x/1UJ1Iw9TJwpyn6UUqFb4jg/zbJKXsmic4dl1i4d4331sdQUY/h2TJMyNrIpQMgDy8DQWuSNCRrbXcVGOIhJpLr+Om5J0ZJO/T9vsVCVjC42aCTwAJPoFpcSoqSh6NkkLpnuaHFxeWt0OoAGh8Dy1UnEQyndBiFKzLG4APa0WFjyHedR4gLT5tO2WL53tfRv8A6bPLNXzPS190ikp9nauRmdsJsRcXLQSOQJuqx7S0kEEEEgg7wRvBWo2nc+GpjrYnFzXhpab6aDVn9pGvqoO1ckEkjZ4XgmRgL2De11hqedtD4c0oV5zcW9Ht0a6P9RmtRhFO2q36rdFhgjxW0jqN5+kjGaIngN3pfKeTgoGzTKiGraBE/tZJBlNspOpJ3ab78lSwyuY4PY4tcDoQbEKyk2krHDKah1uQY0+rWgrEsPNZowtllvfkxGvB5XK947dS3qatlFiLi0/RvDelaNwzanTket4EhelXTUdBUNmtMbhzo2tymPUWIDt9hfdzG9Y9xJNybknUnefFe01XI9rWPe5zWCzQTo0cgnlHy+rpaXv+/wCh5lc+XW8fYdiNWZpXykWzuJtw4BRkqiVGIxM7TxfgNT7K2ssFbRFbnJ36kyKbI4P4b+Y7wr265/UY0ZZGQxjKJJGMLjvs5wBtwW+K4PE5wlNZdep2uHQnGDzadBSUwlKSmkrmHRGkpjinErzcUA1xQmuKEB0dCEIAUWXEoWmMGRv0shZHY3zPF7tBHCxUl97G2+xt4rOYRsm2GGkjklLnUskj2loDWuc8k6g3NhdAaRCEIBEISoBr2Agg94IUOInLrvFwfEaX/fzU1Q5RleeDhfzGh9reiA5o2DoJ6ikO6OUyR/4ZyXADk12dn+q9FZ7c0/RTQVY3ZjBLwyykZHHweAP9yq1wsvRcNq56WV9DhcQpZambcRCELoFAEIQsgQrX/wDkvnEDZaigdKIxbpGusO4HQa7xrvCyKm4di09PfopC0E6tsC0njY7jzCr4ij4iTWq05tfKN9CrkbT0fsn8M0mEU9LWZmfMTE0NJ6QOOh4XsNe/v3KHh9ZC+mmo55QAxzjC89+ptbz18HFVddjtVMMr5TlO9rQGg8jlGo8VWrTDCyd8zto1zbtb3ZsliUrZVvfkle/sjVYNiHzmPoahkMnRjqGWQxvPIENN9wudO691Lr8QaymlimdDdzA2KGE5slhpc+Nj5LFFFlKWCi5XvZa2/rb/AAjEcXJRtbnp+7/ce+ZxAaXOIbuBJIHgO5MUeetiZ2njwGp9Aq+fHmjsMJ5nQKw5wjqyuoSloi4TZJGtF3EDxNlmZ8Ymd8WUfdH771XyTX1cSfErTLFxWiN8cNJ6mnnxmFu4lx5DT1Kr58eeew0N8dT/AAqamzzOyQRvldwja55HjlGnmtLhvyf4lPYvYynbxldd34GX9yFUqY1rV2LNPBra5Q1FbI/tPJ5X09FCknaDa+p3Aak+A711TDfkspW2NTPLMe9rT0Ufo3rfmWtwvA6SlFqenjj5taMx8XnrHzKo1MZfTmXYYW3scc2Z2SrKmeOR9PJHEx7XlzxkzFpBaBmtoSB5LqH/AIOb7vhc/wALSIVKc3N3ZbhBRVkYupgdGcrxY/8Ady8CVscQo2zMynf8J4FY6dhY4tcLEGxUCR5uKY4pSUwlANcUJrkIDpaEIQAhCEAISA892/klQCISpEAKPWt6ub7Jv5d/tdSEEICg2hw4VVNJCT243AHgfhcOYNj5LB4bUmWFj3Cz7Fkg4SMOV49QV0mMWBb9klvkN3sQufYhT/N6+aLc2donj4ZxZkzR+R3i8q/w+tkq2fUpY6lnpX2BCVIvSHABCF4T1cbO08DlfX0CNpamUrnuhVE+OsHYaXeOgVfPjMztxDR90a+pWmWIhHqbI0Js0r3houSAOZsoM+Lwt3OzH7o/dZiWYk3c4nxN14icOdkYC5x3NYC5x8GjVV54zZG+OF3L2fHnHsMA5nU/wq+eukf2nk8tw9ArHDtjMTqNRT9E02607gz8ou72C1OG/JUzQ1dW9/3IWiNvgXOu4+VlSqY3eX2LlPCbI5xLUNbqSB4qdhuEVlV/8elleD8ZbkZ4532B8rrs2E7JYfS2MNLGHD43gySfjfcjyV2qcsW+iLUcMurOT4b8l9U+xqaiOId7YwZH/iNmj3Wqwz5OcNhsXxOndxncXD/1izPZa5Iq8q05as3RpRjojzp4GRtDI2NY0bmsaGtHgBovRCFrNgIQhACEIQAqXaHDs7elaOs0a82/yFdIQHPCU0q1x/DuifmaOo46cj3hVBQDShBQgOmIQhACEIQFHsxhUtOakylt5q6eZuUk2a89UOuN6u0IQAhCEAIUOsxSCEfSSNHK+vosxi+3TGginZmP2naD070BdS1jBVugv1jC19vB2U/q1Zz5QqNxgbUxi76d/Sabyy1pW8+qSbcWhZfBcVldicEj3ZnSTPa7+0wyaDkCGnyXTqmMOaWnvCknZpkWrqxzj58CzO2zhoR4EKsqMak+FrR6lGI4fLRufExueIu6gvZzPui+hbw7+7mmUWzOI1OsdK5oPxSkMb467/Jdzzn0J3OP5T6rWIM9fK/tSHwGg9lDfKBqSt9h/wAlkjtaqrDfuQN1/G//AOq1WF7B4bT2IphI4W68xMpvxAd1R5AKnUxi7lqGFfY45QU89SbU0Ek3NjSW+b+yPMrT4d8m+IS6zPip28Cekk/C2zR+Jdfa0AWAAA3AaAeSVVpYqb05FiOHitTE4b8mFDHYzulqD992Rn4I7XHIkrWYfhsFO3JBDHE3hGxrfWw1UpC0SlKWrNyilogQhCiSBCEIBEJUIBEIQgBCEIAQhCAEIQgPCspmysLHbiPQ9xCwlZTuieWO3g+o7iF0JU+0WG9KzO0ddo/EO8IDGlKkKEB01CFGqa+GIXkka3xIQElCzVbtnTs0YHPPLQe6z9dtpUP0YGsHLU+pQHQ3vDRckAcyqmt2lpYt8gceDdVzOrxOWQ3kkc7xKgyVAGpIHigN3W7cndDF5uP7BUNbtFUy9qUgcG6D2WcFZmIbG1zySAA0bydwHHyWnwvYiums6ZzKdp7j9JJb+0WDfM+SApZJr6k38VEEhkdkhY6V32Y2l587bvNdNoNgqGOxla+d3GV12/8ArbZvqCtJTwMjbkjY1jRuaxoaPQIDmeyOx9aKllTPG2MMzZWucMwuCL2F9bEju3ldJbSjvN/Ze6EB4spY2nMGNB42F/XevZCEAIQkQAhCEAIQhACEIQAhCEAIQhAIhCEAIQhACEKqnxZji+JrJ3AO6N8kTCRG91hYEda4zDVoNu/cgLUmyrKnHIWdAcwLJy7LJmaIw1rcxc5ziO7cN5seCq6GfEHGWHpYxLTZGhrmX+cAi7ZXuuMofu6o0LXb9yiOjjqiM4IbOXGB7gHSUdXHYvhueyLx3A3dRw3EIC+wbGo6kva1rg6NxDwQS0dYhpD7WcCBccirRULKepf0dU1jI6gNdFMx5cI5WgmxDmgmwd1mm25xHfpet3a77a23X5IDIbTYb0b+laOq468nf8oWsnga9pa4XBtoeSEBzevx6pfcOlIHAafoqWWck3Jv4pmJSEAkFe/yd4fHXTObVAyAbhme0d+8MIv5oCBJWNBy31O5o1cfADUqVDhddKLxUcxHF7Swfm1XX6HC6enGWCGOMfcY1t/EgXKloDg9dQVUTss7XRk7hly38Cb38l5wYcSdGknibk+pXZ9pKZkkPXaDZzbX7tQNFAoqGJo6rAEuCt+TnBBGJKiRvXu1jCR2QQS4jmdBfkeK2q8aBoDHW4t/deyAEIQgBCRKgBIlQgBIlQgEQhCAEIQgBCEIAQhCAEIQgEQhCAEIQgBUOL4Jnl6SOnp5Mw64kMjCXbg8uYCHaaWLb6b1fIQFThWC9EInPkLpY45GZgSA5j3ZujINyWt0y3NxbfqVZxwtbctaAXOzOsAMzrAZjbebAa8k9CAEIWc2sxCWKO8b8vgB+4QFzXYhDA3NLI1o5lC4xilS9/We4uPEm6EB/9k=",
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
                            "image_url" : "data:image/jpeg;base64,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",
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
    isSigninFlow = true
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
    apiService.getFeaturedCampaign();
}

// AboutBtnDidClick
function aboutLoyaltyChatbot(recipientId){
    logger.info('Custom Function AboutBtnDidClick');
    var msg1 = 'Loyalty Chatbot 係由 Erin  開發及設計。如有任何意見，請電郵至 erinfan@motherapp.com 。';
    var msg2 = '你可以用Loyalty Chatbot黎signup，睇有幾多point，睇下有咩offer (好似係)。';
    var msg3 = '玩完就裝番Loyalty隻App啦親\uD83D\uDE4C';
    sendTextMessageWithoutQuickReply(recipientId,msg1);
    setTimeout(function() {
        sendTextMessageWithoutQuickReply(recipientId,msg2);
    }, 1000)
    setTimeout(function() {
        sendTextMessageWithoutQuickReply(recipientId,msg3);
    }, 2000)
}

/****************** START SERVER *********************/
// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

