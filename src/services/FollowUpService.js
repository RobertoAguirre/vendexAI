const FollowUp = require('../models/FollowUp');
const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const ClaudeService = require('./ClaudeService');
const Queue = require('bull');
const cron = require('node-cron');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class FollowUpService {
  constructor() {
    this.claudeService = new ClaudeService();
    this.followUpQueue = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      // Colas deshabilitadas para demo - solo cron jobs
      this.setupCronJobs();
      
      this.initialized = true;
      logger.info('🔄 FollowUpService inicializado (sin Redis)');
    } catch (error) {
      logger.error('Error inicializando FollowUpService:', error);
      throw error;
    }
  }

  setupCronJobs() {
    // Ejecutar cada 15 minutos para procesar seguimientos pendientes
    cron.schedule('*/15 * * * *', async () => {
      try {
        await this.processPendingFollowUps();
      } catch (error) {
        logger.error('Error en cron job de seguimientos:', error);
      }
    });

    // Limpiar seguimientos completados antiguos (diario a las 2 AM)
    cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldFollowUps();
      } catch (error) {
        logger.error('Error limpiando seguimientos antiguos:', error);
      }
    });
  }

  async scheduleFollowUp(customerId, type, delayHours = 24, context = {}) {
    try {
      const customer = await Customer.findOne({ customerId });
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      const scheduledFor = new Date(Date.now() + delayHours * 60 * 60 * 1000);
      
      // Verificar si ya existe un seguimiento similar pendiente
      const existingFollowUp = await FollowUp.findOne({
        customerId,
        type,
        status: 'pending',
        scheduledFor: { $gte: new Date() }
      });

      if (existingFollowUp) {
        logger.info(`Seguimiento ${type} ya existe para cliente ${customerId}`);
        return existingFollowUp;
      }

      // Generar mensaje personalizado
      const followUpContext = {
        customer,
        followUpType: type,
        daysSinceLastInteraction: this.calculateDaysSinceLastInteraction(customer),
        ...context
      };

      const personalizedMessage = await this.claudeService.generateFollowUpMessage(followUpContext);

      const followUp = new FollowUp({
        followUpId: uuidv4(),
        customerId,
        type,
        scheduledFor,
        priority: this.determinePriority(type, customer),
        content: {
          subject: this.generateSubject(type, customer),
          message: this.getTemplateMessage(type),
          personalizedMessage,
          channel: this.determineOptimalChannel(customer)
        },
        context: {
          triggerEvent: context.triggerEvent || 'scheduled',
          relatedProducts: context.relatedProducts || [],
          customerSegment: customer.profile.customerType,
          previousInteractions: customer.behavior.interactionCount,
          lastPurchaseAmount: customer.profile.averageOrderValue,
          reasonForFollowUp: context.reason || `Seguimiento ${type} programado`
        },
        automation: {
          isAutomated: true,
          aiGenerated: true,
          personalizationLevel: 'high'
        }
      });

      await followUp.save();
      
      // Cola deshabilitada para demo - seguimientos se procesan por cron
      logger.info(`Seguimiento programado (será procesado por cron): ${followUp.followUpId}`);

      logger.info(`Seguimiento ${type} programado para cliente ${customerId} en ${delayHours} horas`);
      return followUp;

    } catch (error) {
      logger.error('Error programando seguimiento:', error);
      throw error;
    }
  }

  async processPendingFollowUps() {
    try {
      const pendingFollowUps = await FollowUp.getPendingFollowUps(50);
      
      // Procesar seguimientos directamente (sin cola)
      for (const followUp of pendingFollowUps) {
        try {
          await this.processFollowUp({ data: { followUpId: followUp.followUpId } });
        } catch (error) {
          logger.error(`Error procesando seguimiento ${followUp.followUpId}:`, error);
        }
      }

      if (pendingFollowUps.length > 0) {
        logger.info(`${pendingFollowUps.length} seguimientos agregados a la cola`);
      }
    } catch (error) {
      logger.error('Error procesando seguimientos pendientes:', error);
    }
  }

  async processFollowUp(job) {
    const { followUpId } = job.data;
    
    try {
      const followUp = await FollowUp.findOne({ followUpId });
      if (!followUp || followUp.status !== 'pending') {
        logger.warn(`Seguimiento ${followUpId} no encontrado o ya procesado`);
        return;
      }

      followUp.status = 'in_progress';
      await followUp.save();

      // Obtener información actualizada del cliente
      const customer = await Customer.findOne({ customerId: followUp.customerId });
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      // Ejecutar el seguimiento según el canal
      const result = await this.executeFollowUp(followUp, customer);
      
      if (result.success) {
        followUp.markAsExecuted(result.deliveryStatus);
        
        // Programar siguiente seguimiento si es necesario
        if (this.shouldScheduleNextFollowUp(followUp, result)) {
          const nextFollowUp = this.determineNextFollowUpType(followUp);
          await this.scheduleFollowUp(
            followUp.customerId,
            nextFollowUp.type,
            nextFollowUp.delayHours,
            { triggerEvent: 'auto_sequence' }
          );
        }
      } else {
        followUp.markAsFailed(result.error);
      }

      await followUp.save();
      
      // Actualizar métricas del cliente
      await this.updateCustomerMetrics(customer, followUp);

      logger.info(`Seguimiento ${followUpId} procesado: ${result.success ? 'éxito' : 'fallo'}`);

    } catch (error) {
      logger.error(`Error procesando seguimiento ${followUpId}:`, error);
      
      // Marcar como fallido
      const followUp = await FollowUp.findOne({ followUpId });
      if (followUp) {
        followUp.markAsFailed(error.message);
        await followUp.save();
      }
      
      throw error;
    }
  }

  async executeFollowUp(followUp, customer) {
    try {
      const channel = followUp.content.channel;
      const message = followUp.content.personalizedMessage || followUp.content.message;

      switch (channel) {
        case 'email':
          return await this.sendEmail(customer, followUp.content.subject, message);
        
        case 'sms':
          return await this.sendSMS(customer, message);
        
        case 'whatsapp':
          return await this.sendWhatsApp(customer, message);
        
        case 'in_app':
          return await this.sendInAppNotification(customer, message);
        
        default:
          // Por ahora, simular envío exitoso
          return {
            success: true,
            deliveryStatus: 'sent',
            message: 'Seguimiento simulado exitosamente'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendEmail(customer, subject, message) {
    // Aquí integrarías con tu servicio de email (SendGrid, AWS SES, etc.)
    logger.info(`📧 Email enviado a ${customer.email}: ${subject}`);
    return {
      success: true,
      deliveryStatus: 'sent',
      message: 'Email enviado exitosamente'
    };
  }

  async sendSMS(customer, message) {
    // Aquí integrarías con tu servicio de SMS (Twilio, etc.)
    logger.info(`📱 SMS enviado a ${customer.phone}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      deliveryStatus: 'sent',
      message: 'SMS enviado exitosamente'
    };
  }

  async sendWhatsApp(customer, message) {
    // Aquí integrarías con WhatsApp Business API
    logger.info(`💬 WhatsApp enviado a ${customer.phone}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      deliveryStatus: 'sent',
      message: 'WhatsApp enviado exitosamente'
    };
  }

  async sendInAppNotification(customer, message) {
    // Aquí enviarías notificación in-app via WebSocket
    logger.info(`🔔 Notificación in-app para ${customer.customerId}: ${message.substring(0, 50)}...`);
    return {
      success: true,
      deliveryStatus: 'delivered',
      message: 'Notificación in-app enviada'
    };
  }

  determinePriority(type, customer) {
    const priorityMap = {
      'abandoned_cart': 'high',
      'post_purchase': 'medium',
      'reactivation': 'high',
      'upsell': 'medium',
      'nurture': 'low',
      'post_interaction': 'medium'
    };

    let priority = priorityMap[type] || 'medium';

    // Ajustar prioridad basada en el cliente
    if (customer.profile.customerType === 'vip') {
      priority = priority === 'low' ? 'medium' : 'high';
    }

    if (customer.behavior.conversionProbability > 0.8) {
      priority = 'high';
    }

    return priority;
  }

  generateSubject(type, customer) {
    const subjects = {
      'post_interaction': `Hola ${customer.name}, ¿tienes alguna pregunta?`,
      'abandoned_cart': `${customer.name}, no olvides tu carrito`,
      'post_purchase': `Gracias por tu compra, ${customer.name}`,
      'nurture': `${customer.name}, tenemos algo especial para ti`,
      'reactivation': `Te extrañamos, ${customer.name}`,
      'upsell': `${customer.name}, mejora tu experiencia`,
      'feedback_request': `${customer.name}, ¿cómo fue tu experiencia?`
    };

    return subjects[type] || `Hola ${customer.name}`;
  }

  getTemplateMessage(type) {
    const templates = {
      'post_interaction': 'Espero que hayas encontrado útil nuestra conversación. ¿Hay algo más en lo que pueda ayudarte?',
      'abandoned_cart': 'Noté que dejaste algunos productos en tu carrito. ¿Te gustaría completar tu compra?',
      'post_purchase': '¡Gracias por tu compra! Espero que disfrutes tu nuevo producto.',
      'nurture': 'Pensé que te podría interesar esta oferta especial.',
      'reactivation': 'Hace tiempo que no hablamos. ¿Cómo has estado?',
      'upsell': 'Basado en tu compra anterior, creo que esto te podría interesar.',
      'feedback_request': '¿Podrías compartir tu experiencia con nosotros?'
    };

    return templates[type] || 'Espero que tengas un excelente día.';
  }

  determineOptimalChannel(customer) {
    // Lógica para determinar el mejor canal basado en preferencias y comportamiento
    if (customer.phone && customer.preferences?.preferredChannel === 'whatsapp') {
      return 'whatsapp';
    }
    
    if (customer.phone && customer.behavior.engagementLevel === 'high') {
      return 'sms';
    }
    
    return 'email'; // Por defecto
  }

  calculateDaysSinceLastInteraction(customer) {
    if (!customer.behavior.lastInteraction) return 0;
    
    const diffTime = Date.now() - customer.behavior.lastInteraction.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  shouldScheduleNextFollowUp(followUp, result) {
    // No programar siguiente si el cliente respondió
    if (followUp.response.customerResponded) {
      return false;
    }

    // Programar siguiente para ciertos tipos
    const typesWithSequence = ['nurture', 'reactivation', 'abandoned_cart'];
    return typesWithSequence.includes(followUp.type);
  }

  determineNextFollowUpType(followUp) {
    const sequences = {
      'nurture': [
        { type: 'nurture', delayHours: 72 },
        { type: 'upsell', delayHours: 168 } // 1 semana
      ],
      'abandoned_cart': [
        { type: 'abandoned_cart', delayHours: 48 },
        { type: 'nurture', delayHours: 168 }
      ],
      'reactivation': [
        { type: 'reactivation', delayHours: 168 },
        { type: 'feedback_request', delayHours: 336 } // 2 semanas
      ]
    };

    const sequence = sequences[followUp.type];
    if (!sequence) return null;

    // Determinar siguiente paso en la secuencia
    const currentStep = followUp.execution.attempts;
    return sequence[currentStep] || null;
  }

  async updateCustomerMetrics(customer, followUp) {
    // Actualizar métricas de seguimiento del cliente
    if (!customer.followUpMetrics) {
      customer.followUpMetrics = {
        totalSent: 0,
        totalResponded: 0,
        responseRate: 0,
        lastFollowUpDate: null
      };
    }

    customer.followUpMetrics.totalSent += 1;
    customer.followUpMetrics.lastFollowUpDate = new Date();

    if (followUp.response.customerResponded) {
      customer.followUpMetrics.totalResponded += 1;
    }

    customer.followUpMetrics.responseRate = 
      customer.followUpMetrics.totalResponded / customer.followUpMetrics.totalSent;

    await customer.save();
  }

  async recordFollowUpResponse(followUpId, responseContent, sentiment = 'neutral') {
    try {
      const followUp = await FollowUp.findOne({ followUpId });
      if (!followUp) {
        throw new Error('Seguimiento no encontrado');
      }

      followUp.recordResponse(responseContent, sentiment);
      await followUp.save();

      // Actualizar métricas del cliente
      const customer = await Customer.findOne({ customerId: followUp.customerId });
      if (customer) {
        await this.updateCustomerMetrics(customer, followUp);
      }

      logger.info(`Respuesta registrada para seguimiento ${followUpId}`);
      return followUp;

    } catch (error) {
      logger.error('Error registrando respuesta de seguimiento:', error);
      throw error;
    }
  }

  async getFollowUpMetrics(startDate, endDate, type = null) {
    try {
      const matchQuery = {
        createdAt: { $gte: startDate, $lte: endDate }
      };

      if (type) {
        matchQuery.type = type;
      }

      const metrics = await FollowUp.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$type',
            totalSent: { $sum: 1 },
            totalResponded: { $sum: { $cond: ['$response.customerResponded', 1, 0] } },
            totalConverted: { $sum: { $cond: ['$response.conversionAchieved', 1, 0] } },
            totalRevenue: { $sum: '$response.conversionValue' },
            avgResponseTime: {
              $avg: {
                $subtract: ['$response.responseDate', '$execution.executedAt']
              }
            }
          }
        },
        {
          $project: {
            type: '$_id',
            totalSent: 1,
            totalResponded: 1,
            totalConverted: 1,
            totalRevenue: 1,
            responseRate: { $divide: ['$totalResponded', '$totalSent'] },
            conversionRate: { $divide: ['$totalConverted', '$totalSent'] },
            avgResponseTimeHours: { $divide: ['$avgResponseTime', 1000 * 60 * 60] }
          }
        }
      ]);

      return metrics;
    } catch (error) {
      logger.error('Error obteniendo métricas de seguimiento:', error);
      throw error;
    }
  }

  async cleanupOldFollowUps() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await FollowUp.deleteMany({
        status: { $in: ['completed', 'failed'] },
        updatedAt: { $lt: thirtyDaysAgo }
      });

      logger.info(`${result.deletedCount} seguimientos antiguos eliminados`);
    } catch (error) {
      logger.error('Error limpiando seguimientos antiguos:', error);
    }
  }
}

module.exports = FollowUpService;