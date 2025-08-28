const express = require('express');
const Joi = require('joi');
const ConversationService = require('../services/ConversationService');
const FollowUpService = require('../services/FollowUpService');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// Inicializar servicios
const conversationService = new ConversationService();
const followUpService = new FollowUpService();

// Inicializar servicios al cargar el módulo
(async () => {
  try {
    await conversationService.initialize();
  } catch (error) {
    logger.error('Error inicializando ConversationService:', error);
  }
})();

// Esquemas de validación
const messageSchema = Joi.object({
  customerId: Joi.string().required().min(1).max(100),
  message: Joi.string().required().min(1).max(5000),
  channel: Joi.string().valid('web', 'whatsapp', 'email', 'phone', 'chat').default('web')
});

const contextUpdateSchema = Joi.object({
  customerId: Joi.string().required(),
  preferences: Joi.object({
    communicationStyle: Joi.string().valid('formal', 'casual', 'technical', 'emotional'),
    preferredProducts: Joi.array().items(Joi.string()),
    budgetRange: Joi.object({
      min: Joi.number().min(0),
      max: Joi.number().min(0)
    }),
    interests: Joi.array().items(Joi.string()),
    painPoints: Joi.array().items(Joi.string())
  }),
  profile: Joi.object({
    customerType: Joi.string().valid('new', 'returning', 'vip', 'at_risk'),
    lifetimeValue: Joi.number().min(0),
    totalPurchases: Joi.number().min(0),
    averageOrderValue: Joi.number().min(0)
  }),
  tags: Joi.array().items(Joi.string()),
  note: Joi.string().max(1000),
  author: Joi.string().max(100)
});

/**
 * @route POST /api/chat/message
 * @desc Enviar mensaje al asistente
 * @access Public (en producción debería ser privado)
 */
router.post('/message', validate(messageSchema), async (req, res) => {
  try {
    const { customerId, message, channel } = req.body;
    
    logger.info(`Mensaje recibido de cliente ${customerId}: ${message.substring(0, 100)}...`);
    
    const result = await conversationService.processMessage(customerId, message, channel);
    
    // Programar seguimiento si es necesario
    if (result.metadata.followUpNeeded?.needed) {
      try {
        await followUpService.scheduleFollowUp(
          customerId,
          result.metadata.followUpNeeded.type,
          result.metadata.followUpNeeded.delayHours,
          {
            triggerEvent: 'conversation_end',
            conversationId: result.conversationId
          }
        );
      } catch (followUpError) {
        logger.warn('Error programando seguimiento:', followUpError);
        // No fallar la respuesta principal por esto
      }
    }
    
    res.json({
      success: true,
      data: {
        conversationId: result.conversationId,
        message: result.message,
        metadata: {
          leadScore: result.metadata.leadScore,
          conversionProbability: result.metadata.conversionProbability,
          customerSentiment: result.metadata.customerSentiment,
          intent: result.metadata.intent,
          sentiment: result.metadata.sentiment
        }
      },
      usage: result.usage
    });
    
  } catch (error) {
    logger.error('Error procesando mensaje:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: 'No se pudo procesar el mensaje'
    });
  }
});

/**
 * @route GET /api/chat/history/:customerId
 * @desc Obtener historial de conversaciones de un cliente
 * @access Private
 */
router.get('/history/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    const conversations = await conversationService.getConversationHistory(customerId, limit);
    
    res.json({
      success: true,
      data: {
        customerId,
        conversations,
        total: conversations.length
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo historial:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo historial de conversaciones'
    });
  }
});

/**
 * @route POST /api/chat/context
 * @desc Actualizar contexto del cliente
 * @access Private
 */
router.post('/context', auth, validate(contextUpdateSchema), async (req, res) => {
  try {
    const contextUpdates = req.body;
    
    const updatedCustomer = await conversationService.updateCustomerContext(
      contextUpdates.customerId,
      contextUpdates
    );
    
    res.json({
      success: true,
      data: {
        customerId: updatedCustomer.customerId,
        preferences: updatedCustomer.preferences,
        profile: updatedCustomer.profile,
        tags: updatedCustomer.tags,
        updatedAt: updatedCustomer.updatedAt
      }
    });
    
  } catch (error) {
    logger.error('Error actualizando contexto:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando contexto del cliente'
    });
  }
});

/**
 * @route GET /api/chat/conversation/:conversationId
 * @desc Obtener detalles de una conversación específica
 * @access Private
 */
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const includeMessages = req.query.includeMessages === 'true';
    
    const Conversation = require('../models/Conversation');
    let query = Conversation.findOne({ conversationId });
    
    if (!includeMessages) {
      query = query.select('-messages');
    }
    
    const conversation = await query;
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }
    
    res.json({
      success: true,
      data: conversation
    });
    
  } catch (error) {
    logger.error('Error obteniendo conversación:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo detalles de la conversación'
    });
  }
});

/**
 * @route POST /api/chat/conversation/:conversationId/close
 * @desc Cerrar una conversación
 * @access Private
 */
router.post('/conversation/:conversationId/close', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason } = req.body;
    
    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findOne({ conversationId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }
    
    conversation.status = 'completed';
    conversation.summary.nextSteps = [`Conversación cerrada: ${reason || 'Sin razón especificada'}`];
    conversation.summary.lastUpdated = new Date();
    
    await conversation.save();
    
    // Programar seguimiento post-conversación si el lead score es alto
    if (conversation.salesMetrics.leadScore > 60) {
      try {
        await followUpService.scheduleFollowUp(
          conversation.customerId,
          'post_interaction',
          24,
          {
            triggerEvent: 'conversation_closed',
            conversationId,
            reason
          }
        );
      } catch (followUpError) {
        logger.warn('Error programando seguimiento post-conversación:', followUpError);
      }
    }
    
    res.json({
      success: true,
      data: {
        conversationId,
        status: conversation.status,
        closedAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Error cerrando conversación:', error);
    res.status(500).json({
      success: false,
      error: 'Error cerrando la conversación'
    });
  }
});

/**
 * @route GET /api/chat/active-conversations
 * @desc Obtener conversaciones activas
 * @access Private
 */
router.get('/active-conversations', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const Conversation = require('../models/Conversation');
    
    const conversations = await Conversation.find({ status: 'active' })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('conversationId customerId context salesMetrics updatedAt')
      .populate('customerId', 'name email profile.customerType');
    
    const total = await Conversation.countDocuments({ status: 'active' });
    
    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo conversaciones activas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo conversaciones activas'
    });
  }
});

/**
 * @route GET /api/chat/customer/:customerId/summary
 * @desc Obtener resumen del cliente
 * @access Private
 */
router.get('/customer/:customerId/summary', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const Customer = require('../models/Customer');
    const Conversation = require('../models/Conversation');
    
    const customer = await Customer.findOne({ customerId });
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }
    
    // Obtener estadísticas de conversaciones
    const conversationStats = await Conversation.aggregate([
      { $match: { customerId } },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          avgLeadScore: { $avg: '$salesMetrics.leadScore' },
          avgConversionProbability: { $avg: '$salesMetrics.conversionProbability' },
          totalEstimatedValue: { $sum: '$salesMetrics.estimatedValue' }
        }
      }
    ]);
    
    const stats = conversationStats[0] || {
      totalConversations: 0,
      avgLeadScore: 0,
      avgConversionProbability: 0,
      totalEstimatedValue: 0
    };
    
    res.json({
      success: true,
      data: {
        customer: {
          customerId: customer.customerId,
          name: customer.name,
          email: customer.email,
          profile: customer.profile,
          preferences: customer.preferences,
          behavior: customer.behavior,
          sentiment: customer.sentiment,
          tags: customer.tags
        },
        stats
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo resumen del cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo resumen del cliente'
    });
  }
});

module.exports = router;