const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { lineClient, channelSecret } = require('../config/line');
const LineToken = require('../models/LineToken');
const { sendSuccess, sendError, asyncHandler } = require('../utils/responseHelpers');

/**
 * @swagger
 * tags:
 *   name: LINE
 *   description: LINE Bot webhook and management endpoints
 */

/**
 * @swagger
 * /api/line/webhook:
 *   post:
 *     summary: LINE Bot webhook
 *     description: Receives events from LINE platform
 *     tags: [LINE]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Event processed successfully
 *       400:
 *         description: Invalid signature or request
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  if (!lineClient || !channelSecret) {
    return sendError(res, 'LINE Bot not configured', 503);
  }

  const signature = req.get('x-line-signature');
  if (!signature) {
    return sendError(res, 'Missing LINE signature', 400);
  }

  // Verify signature
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64');

  if (signature !== expectedSignature) {
    console.error('Invalid LINE signature');
    return sendError(res, 'Invalid signature', 400);
  }

  const events = req.body.events;
  if (!events || !Array.isArray(events)) {
    return sendSuccess(res, 'No events to process');
  }

  // Process each event
  for (const event of events) {
    try {
      await handleLineEvent(event);
    } catch (error) {
      console.error('Error handling LINE event:', error);
    }
  }

  sendSuccess(res, 'Events processed');
}));

/**
 * Handle different types of LINE events
 */
async function handleLineEvent(event) {
  const { type, source, message, timestamp } = event;
  const userId = source?.userId;

  console.log(`Received LINE event: ${type} from user: ${userId}`);

  switch (type) {
    case 'message':
      await handleMessage(event);
      break;
    case 'follow':
      await handleFollow(event);
      break;
    case 'unfollow':
      await handleUnfollow(event);
      break;
    default:
      console.log(`Unhandled event type: ${type}`);
  }
}

/**
 * Handle incoming messages
 */
async function handleMessage(event) {
  const { source, message, replyToken } = event;
  const userId = source?.userId;
  const messageText = message?.text?.toLowerCase();

  if (!userId || !messageText) return;

  try {
    // Store user info
    await LineToken.store(userId, null, { 
      lastMessage: messageText,
      lastMessageAt: new Date().toISOString()
    });

    // Handle admin registration commands
    if (messageText.includes('register admin') || messageText.includes('เป็นแอดมิน')) {
      const replyMessage = {
        type: 'text',
        text: '🔧 Admin Registration\n\nYou have been registered to receive order notifications!\n\nYou will now get notified when:\n• New orders are placed\n• Order status updates occur\n\nTo unregister, send "unregister admin"'
      };

      await lineClient.replyMessage(replyToken, replyMessage);
      console.log(`Admin registered: ${userId}`);
    }
    
    else if (messageText.includes('unregister admin') || messageText.includes('ยกเลิกแอดมิน')) {
      await LineToken.remove(userId);
      
      const replyMessage = {
        type: 'text',
        text: '✅ You have been unregistered from admin notifications.'
      };

      await lineClient.replyMessage(replyToken, replyMessage);
      console.log(`Admin unregistered: ${userId}`);
    }
    
    else if (messageText.includes('help') || messageText.includes('ช่วยเหลือ')) {
      const replyMessage = {
        type: 'text',
        text: '🤖 Timing API Bot Help\n\nCommands:\n• "register admin" - Register for order notifications\n• "unregister admin" - Stop receiving notifications\n• "help" - Show this help message\n\nBot will notify admins about new orders and status updates.'
      };

      await lineClient.replyMessage(replyToken, replyMessage);
    }
    
    else {
      // Default response for unrecognized messages
      const replyMessage = {
        type: 'text',
        text: '👋 Hello! I\'m the Timing API notification bot.\n\nSend "help" to see available commands.'
      };

      await lineClient.replyMessage(replyToken, replyMessage);
    }

  } catch (error) {
    console.error('Error handling LINE message:', error);
  }
}

/**
 * Handle user following the bot
 */
async function handleFollow(event) {
  const { source, replyToken } = event;
  const userId = source?.userId;

  if (!userId) return;

  try {
    // Get user profile
    let userProfile = {};
    try {
      userProfile = await lineClient.getProfile(userId);
    } catch (error) {
      console.log('Could not get user profile:', error.message);
    }

    // Store user info
    await LineToken.store(userId, null, {
      displayName: userProfile.displayName || 'Unknown',
      pictureUrl: userProfile.pictureUrl || null,
      followedAt: new Date().toISOString()
    });

    // Send welcome message
    const welcomeMessage = {
      type: 'text',
      text: `🎉 Welcome to Timing API Bot!\n\nHi ${userProfile.displayName || 'there'}!\n\nI can help you manage order notifications.\n\nSend "register admin" to start receiving order notifications, or "help" for more commands.`
    };

    await lineClient.replyMessage(replyToken, welcomeMessage);
    console.log(`New follower: ${userId} (${userProfile.displayName})`);

  } catch (error) {
    console.error('Error handling LINE follow:', error);
  }
}

/**
 * Handle user unfollowing the bot
 */
async function handleUnfollow(event) {
  const { source } = event;
  const userId = source?.userId;

  if (!userId) return;

  try {
    await LineToken.remove(userId);
    console.log(`User unfollowed: ${userId}`);
  } catch (error) {
    console.error('Error handling LINE unfollow:', error);
  }
}

module.exports = router;