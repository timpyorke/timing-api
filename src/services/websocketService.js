const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { admin } = require('../config/firebase'); // Import initialized Firebase admin

class WebSocketService {
  constructor() {
    this.io = null;
    this.adminConnections = new Set();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Admin namespace for authenticated connections
    const adminNamespace = this.io.of('/admin');
    
    adminNamespace.use(async (socket, next) => {
      // Try to get token from handshake auth first, then from query parameters
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        console.log('❌ WebSocket: No token provided');
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        console.log('🔑 WebSocket: Verifying token:', token.substring(0, 20) + '...');
        
        // Try Firebase token verification first
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          socket.userId = decodedToken.uid;
          socket.username = decodedToken.email || decodedToken.name || 'admin';
          console.log('✅ WebSocket: Firebase token verified for user:', socket.username);
          return next();
        } catch (firebaseError) {
          console.log('⚠️ WebSocket: Firebase token verification failed, trying JWT:', firebaseError.message);
          
          // Fallback to JWT verification
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id;
          socket.username = decoded.username;
          console.log('✅ WebSocket: JWT token verified for user:', socket.username);
          return next();
        }
      } catch (err) {
        console.error('❌ WebSocket: Authentication failed:', err.message);
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    adminNamespace.on('connection', (socket) => {
      console.log(`Admin connected: ${socket.username} (${socket.id})`);
      this.adminConnections.add(socket.id);

      socket.on('disconnect', () => {
        console.log(`Admin disconnected: ${socket.username} (${socket.id})`);
        this.adminConnections.delete(socket.id);
      });

      // Send connection confirmation
      socket.emit('connected', {
        message: 'Connected to admin notifications',
        userId: socket.userId,
        username: socket.username
      });
    });

    console.log('WebSocket service initialized');
  }

  // Send real-time order notification to all connected admins
  sendOrderNotification(order) {
    if (!this.io) {
      console.warn('WebSocket service not initialized');
      return;
    }

    const notification = {
      type: 'new_order',
      order: {
        id: order.id,
        customer_name: order.customer_info?.name || 'Customer',
        total: order.total,
        items: order.items,
        created_at: order.created_at || new Date().toISOString(),
        status: order.status || 'pending'
      },
      timestamp: new Date().toISOString()
    };

    // Send to all connected admins
    this.io.of('/admin').emit('new_order', notification);
    
    console.log(`Real-time order notification sent to ${this.adminConnections.size} admin(s)`);
  }

  // Send order status update to all connected admins
  sendOrderStatusUpdate(order, newStatus) {
    if (!this.io) {
      console.warn('WebSocket service not initialized');
      return;
    }

    const notification = {
      type: 'order_status_update',
      order: {
        id: order.id,
        customer_name: order.customer_info?.name || 'Customer',
        status: newStatus,
        updated_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    // Send to all connected admins
    this.io.of('/admin').emit('order_status_update', notification);
    
    console.log(`Real-time status update sent for order ${order.id}: ${newStatus}`);
  }

  // Get connection statistics
  getStats() {
    return {
      adminConnections: this.adminConnections.size,
      isInitialized: this.io !== null
    };
  }
}

// Export singleton instance
module.exports = new WebSocketService();