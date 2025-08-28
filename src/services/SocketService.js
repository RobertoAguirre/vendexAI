const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

class SocketService {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this));
    
    this.io.on('connection', (socket) => {
      logger.info(`Cliente conectado: ${socket.id}`);
      
      // Almacenar información del cliente
      this.connectedClients.set(socket.id, {
        userId: socket.userId,
        customerId: socket.customerId,
        connectedAt: new Date()
      });

      // Unir a sala específica del cliente
      if (socket.customerId) {
        socket.join(`customer:${socket.customerId}`);
      }

      // Handlers de eventos
      socket.on('join_conversation', this.handleJoinConversation.bind(this, socket));
      socket.on('typing_start', this.handleTypingStart.bind(this, socket));
      socket.on('typing_stop', this.handleTypingStop.bind(this, socket));
      socket.on('message_read', this.handleMessageRead.bind(this, socket));
      socket.on('disconnect', this.handleDisconnect.bind(this, socket));
    });
  }

  authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        // Permitir conexiones sin autenticación para clientes públicos
        socket.userId = null;
        socket.customerId = socket.handshake.query.customerId || null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.customerId = socket.handshake.query.customerId || null;
      
      next();
    } catch (error) {
      logger.warn('Error autenticando socket:', error.message);
      next(new Error('Authentication error'));
    }
  }

  handleJoinConversation(socket, data) {
    const { conversationId } = data;
    
    if (!conversationId) {
      socket.emit('error', { message: 'conversationId requerido' });
      return;
    }

    socket.join(`conversation:${conversationId}`);
    socket.conversationId = conversationId;
    
    logger.info(`Cliente ${socket.id} se unió a conversación ${conversationId}`);
    
    socket.emit('joined_conversation', { conversationId });
  }

  handleTypingStart(socket, data) {
    const { conversationId } = data;
    
    if (conversationId && socket.customerId) {
      socket.to(`conversation:${conversationId}`).emit('typing_start', {
        customerId: socket.customerId,
        conversationId
      });
    }
  }

  handleTypingStop(socket, data) {
    const { conversationId } = data;
    
    if (conversationId && socket.customerId) {
      socket.to(`conversation:${conversationId}`).emit('typing_stop', {
        customerId: socket.customerId,
        conversationId
      });
    }
  }

  handleMessageRead(socket, data) {
    const { messageId, conversationId } = data;
    
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit('message_read', {
        messageId,
        conversationId,
        readBy: socket.customerId || socket.userId
      });
    }
  }

  handleDisconnect(socket) {
    logger.info(`Cliente desconectado: ${socket.id}`);
    
    // Notificar a otros en la conversación
    if (socket.conversationId) {
      socket.to(`conversation:${socket.conversationId}`).emit('user_disconnected', {
        customerId: socket.customerId,
        conversationId: socket.conversationId
      });
    }
    
    this.connectedClients.delete(socket.id);
  }

  // Métodos para enviar mensajes desde el servidor
  sendMessageToCustomer(customerId, event, data) {
    this.io.to(`customer:${customerId}`).emit(event, data);
  }

  sendMessageToConversation(conversationId, event, data) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  // Notificar nuevo mensaje en conversación
  notifyNewMessage(conversationId, message, metadata = {}) {
    this.sendMessageToConversation(conversationId, 'new_message', {
      conversationId,
      message,
      metadata,
      timestamp: new Date()
    });
  }

  // Notificar actualización de lead score
  notifyLeadScoreUpdate(conversationId, customerId, leadScore, conversionProbability) {
    this.sendMessageToConversation(conversationId, 'lead_score_update', {
      conversationId,
      customerId,
      leadScore,
      conversionProbability,
      timestamp: new Date()
    });
  }

  // Notificar seguimiento programado
  notifyFollowUpScheduled(customerId, followUpId, type, scheduledFor) {
    this.sendMessageToCustomer(customerId, 'followup_scheduled', {
      followUpId,
      type,
      scheduledFor,
      timestamp: new Date()
    });
  }

  // Notificar alerta al equipo de ventas
  notifyAlert(alertType, data) {
    this.io.to('sales_team').emit('alert', {
      type: alertType,
      data,
      timestamp: new Date()
    });
  }

  // Obtener estadísticas de conexiones
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      authenticatedUsers: 0,
      guestUsers: 0,
      connectionsByCustomer: {}
    };

    this.connectedClients.forEach((client, socketId) => {
      if (client.userId) {
        stats.authenticatedUsers++;
      } else {
        stats.guestUsers++;
      }

      if (client.customerId) {
        if (!stats.connectionsByCustomer[client.customerId]) {
          stats.connectionsByCustomer[client.customerId] = 0;
        }
        stats.connectionsByCustomer[client.customerId]++;
      }
    });

    return stats;
  }

  // Desconectar cliente específico
  disconnectClient(socketId, reason = 'Server disconnect') {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('force_disconnect', { reason });
      socket.disconnect(true);
    }
  }

  // Enviar notificación push (simulado)
  sendPushNotification(customerId, title, body, data = {}) {
    // En una implementación real, aquí integrarías con un servicio de push notifications
    // como Firebase Cloud Messaging, OneSignal, etc.
    
    logger.info(`Push notification enviada a ${customerId}: ${title}`);
    
    this.sendMessageToCustomer(customerId, 'push_notification', {
      title,
      body,
      data,
      timestamp: new Date()
    });
  }
}

module.exports = SocketService;