const express = require('express');
const line = require('@line/bot-sdk');
const orm = require('../orm');

const router = express.Router();
const { LINE_MESSAGES } = require('../utils/constants');

// LINE configuration from environment
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.LINE_CHANNEL_SECRET;

// Guard flags
const hasConfig = Boolean(channelAccessToken && channelSecret);

// Initialize LINE SDK client (for replies and profile fetching)
let client = null;
if (channelAccessToken) {
  client = new line.Client({ channelAccessToken });
} else {
  console.warn('LINE webhook: LINE_CHANNEL_ACCESS_TOKEN is not set. Replies disabled.');
}

// Helper: upsert LINE user id into DB with optional profile info
async function upsertLineUser(lineUserId, userInfo = {}) {
  try {
    const { LineToken } = orm.models;
    await LineToken.upsert({ line_user_id: lineUserId, user_info: userInfo || {} });
    const record = await LineToken.findOne({
      attributes: ['id', 'line_user_id', 'created_at', 'updated_at'],
      where: { line_user_id: lineUserId },
      raw: true,
    });
    return record;
  } catch (err) {
    console.error('LINE webhook: failed to upsert line_user_id', { lineUserId, error: err.message });
    throw err;
  }
}

// Helper: remove LINE user id (on unfollow)
async function removeLineUser(lineUserId) {
  try {
    const { LineToken } = orm.models;
    await LineToken.destroy({ where: { line_user_id: lineUserId } });
  } catch (err) {
    console.error('LINE webhook: failed to remove line_user_id', { lineUserId, error: err.message });
  }
}

// Handle a single LINE event
async function handleEvent(event) {
  const userId = event?.source?.userId;

  // Optionally load profile for storage
  const fetchProfile = async () => {
    if (!client || !userId) return null;
    try {
      const profile = await client.getProfile(userId);
      return profile; // { userId, displayName, pictureUrl, statusMessage, language }
    } catch (e) {
      return null;
    }
  };

  switch (event.type) {
    case 'follow': {
      const profile = await fetchProfile();
      await upsertLineUser(userId, { source: 'follow', profile });
      if (client && event.replyToken) {
        await client.replyMessage(event.replyToken, { type: 'text', text: LINE_MESSAGES.FOLLOW_THANK_YOU });
      }
      break;
    }
    case 'unfollow': {
      if (userId) await removeLineUser(userId);
      break;
    }
    case 'message': {
      if (event.message?.type === 'text') {
        const text = (event.message.text || '').trim().toLowerCase();
        if (text === 'register' || text === 'subscribe') {
          const profile = await fetchProfile();
          await upsertLineUser(userId, { source: 'message', profile });
          if (client && event.replyToken) {
            await client.replyMessage(event.replyToken, { type: 'text', text: LINE_MESSAGES.REGISTER_SUCCESS });
          }
        } else if (text === 'help') {
          if (client && event.replyToken) {
            await client.replyMessage(event.replyToken, { type: 'text', text: LINE_MESSAGES.HELP_TEXT });
          }
        } else {
          // Optional: echo minimal acknowledgement to avoid unused replies
          if (client && event.replyToken) {
            await client.replyMessage(event.replyToken, { type: 'text', text: LINE_MESSAGES.OK_ACK });
          }
        }
      }
      break;
    }
    default:
      // Ignore other event types
      break;
  }
}

if (hasConfig) {
  // Secure webhook with LINE signature validation
  const middleware = line.middleware({ channelSecret });
  router.post('/webhook', middleware, async (req, res) => {
    try {
      const events = Array.isArray(req.body?.events) ? req.body.events : [];
      await Promise.all(events.map(ev => handleEvent(ev)));
      res.status(200).end();
    } catch (err) {
      console.error('LINE webhook: handler error', err);
      // Return 200 to prevent LINE retries in case of non-transient errors
      res.status(200).end();
    }
  });
} else {
  console.warn('LINE webhook: missing LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET. Webhook will accept but do nothing.');
  // Fallback route keeps endpoint alive but does not process events
  router.post('/webhook', (req, res) => res.status(200).end());
}

module.exports = router;
