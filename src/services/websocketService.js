// Minimal WebSocket service stub to satisfy imports.
// This can be replaced with a real implementation if needed.

let initialized = false;
let adminConnections = 0;

function initialize(_server) {
  // No-op stub
  initialized = true;
  if (process.env.NODE_ENV !== 'test') {
    console.log('WebSocket service (stub) initialized');
  }
}

function sendOrderStatusUpdate(_order, _status) {
  // No-op stub for broadcasting order status updates
  return true;
}

function getStats() {
  return {
    adminConnections,
    isInitialized: initialized,
  };
}

module.exports = {
  initialize,
  sendOrderStatusUpdate,
  getStats,
};

