const line = require('@line/bot-sdk');
const orm = require('../orm');

// Initialize LINE client using channel access token
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

let lineClient = null;
if (channelAccessToken) {
  lineClient = new line.Client({ channelAccessToken });
} else {
  console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. LINE notifications are disabled.');
}

// Helper to fetch all registered LINE user IDs from DB
async function getAllLineUserIds() {
  try {
    const { LineToken } = orm.models;
    if (!LineToken) {
      console.error('ORM model LineToken not initialized');
      return [];
    }
    const rows = await LineToken.findAll({ attributes: ['line_user_id'], raw: true });
    const ids = rows.map(r => r.line_user_id).filter(Boolean);
    // Deduplicate
    return Array.from(new Set(ids));
  } catch (err) {
    console.error('Failed to fetch LINE user IDs (ORM):', err.message);
    return [];
  }
}

// Format date like: 9 Sep, 12.00PM (no space before AM/PM, dot as separator)
function formatOrderDate(dateStr) {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const month = monthNames[d.getMonth()];
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${day} ${month}, ${hours}.${minutes}${ampm}`;
  } catch (_) {
    return dateStr;
  }
}

// Build message text for an order
function buildOrderCreatedMessage(order) {
  const orderNumber = order?.id ?? order?.order_number ?? '—';
  const createdAt = order?.created_at || new Date().toISOString();
  const timePart = formatOrderDate(createdAt);
  const customerName = order?.customer_name ? order?.customer_name :'Customer';
  const note = order?.notes ? ` (${order.notes})` : '';

  // Items may come localized from Order model
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemLines = items.map(it => `# ${it.quantity}x ${it.menu_name || it.name || 'Item'}`);

  const header = `Order #${orderNumber}`;
  const atLine = `At  ${timePart}`; // double space as provided in template
  const divider = '---';
  const itemHeader = 'Item';
  const link = `https://timing-backoffice.vercel.app/orders/${orderNumber}`;

  const parts = [
    header,
    atLine,
    divider,
    customerName,
    divider,
    itemHeader,
    ...itemLines,
    divider,
    note,
    divider,
    link,
  ];

  return parts.join('\n');
}

// Push message to all registered LINE user IDs
async function pushToAll(message) {
  const ids = await getAllLineUserIds();
  if (!ids.length) {
    console.warn('No LINE user IDs found; skipping LINE notification');
    return { sent: 0, recipients: [] };
  }
  if (!lineClient) {
    console.warn('LINE client is not initialized; skipping LINE notification');
    return { sent: 0, recipients: [] };
  }

  // Send individually to avoid multicast permission issues
  const results = await Promise.allSettled(
    ids.map(id => lineClient.pushMessage(id, { type: 'text', text: message }))
  );

  const success = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - success;
  if (failed) {
    console.warn(`LINE notifications: ${success} sent, ${failed} failed`);
  }
  return { sent: success, recipients: ids };
}

async function sendOrderCreatedNotification(order) {
  try {
    const message = buildOrderCreatedMessage(order);
    return await pushToAll(message);
  } catch (err) {
    console.error('Failed to send LINE order created notification:', err.message);
    return { sent: 0, recipients: [] };
  }
}

module.exports = {
  sendOrderCreatedNotification,
  buildOrderCreatedMessage,
};
