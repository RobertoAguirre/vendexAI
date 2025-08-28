const express = require('express');
const Joi = require('joi');
const FollowUpService = require('../services/FollowUpService');
const FollowUp = require('../models/FollowUp');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// Inicializar servicio
const followUpService = new FollowUpService();

// Esquemas de validación
const scheduleFollowUpSchema = Joi.object({
  customerId: Joi.string().required(),
  type: Joi.string().valid(
    'post_interaction',
    'abandoned_cart',
    'post_purchase',
    'nurture',
    'reactivation',
    'upsell',
    'feedback_request',
    'appointment_reminder'
  ).required(),
  delayHours: Joi.number().min(1).max(8760).default(24), // máximo 1 año
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  channel: Joi.string().valid('email', 'sms', 'whatsapp', 'call', 'in_app').default('email'),
  context: Joi.object({
    triggerEvent: Joi.string(),
    relatedProducts: Joi.array().items(Joi.string()),
    reason: Joi.string(),
    conversationId: Joi.string()
  }).default({})
});

const responseSchema = Joi.object({
  followUpId: Joi.string().required(),
  responseContent: Joi.string().required().max(2000),
  sentiment: Joi.string().valid('very_negative', 'negative', 'neutral', 'positive', 'very_positive').default('neutral'),
  actionTaken: Joi.string().max(500),
  conversionValue: Joi.number().min(0)
});

/**
 * @route POST /api/followup/schedule
 * @desc Programar un seguimiento
 * @access Private
 */
router.post('/schedule', auth, validate(scheduleFollowUpSchema), async (req, res) => {
  try {
    const { customerId, type, delayHours, priority, channel, context } = req.body;
    
    const followUp = await followUpService.scheduleFollowUp(
      customerId,
      type,
      delayHours,
      {
        ...context,
        priority,
        channel
      }
    );
    
    res.status(201).json({
      success: true,
      data: {
        followUpId: followUp.followUpId,
        customerId: followUp.customerId,
        type: followUp.type,
        scheduledFor: followUp.scheduledFor,
        priority: followUp.priority,
        status: followUp.status
      }
    });
    
  } catch (error) {
    logger.error('Error programando seguimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error programando seguimiento'
    });
  }
});

/**
 * @route GET /api/followup/pending
 * @desc Obtener seguimientos pendientes
 * @access Private
 */
router.get('/pending', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const priority = req.query.priority;
    const type = req.query.type;
    
    let query = { status: 'pending', scheduledFor: { $lte: new Date() } };
    
    if (priority) {
      query.priority = priority;
    }
    
    if (type) {
      query.type = type;
    }
    
    const followUps = await FollowUp.find(query)
      .sort({ priority: -1, scheduledFor: 1 })
      .limit(limit)
      .populate('customerId', 'name email phone profile.customerType');
    
    res.json({
      success: true,
      data: {
        followUps,
        total: followUps.length
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo seguimientos pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo seguimientos pendientes'
    });
  }
});

/**
 * @route GET /api/followup/customer/:customerId
 * @desc Obtener seguimientos de un cliente específico
 * @access Private
 */
router.get('/customer/:customerId', auth, async (req, res) => {
  try {
    const { customerId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    
    let query = { customerId };
    if (status) {
      query.status = status;
    }
    
    const followUps = await FollowUp.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      data: {
        customerId,
        followUps,
        total: followUps.length
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo seguimientos del cliente:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo seguimientos del cliente'
    });
  }
});

/**
 * @route POST /api/followup/response
 * @desc Registrar respuesta a un seguimiento
 * @access Private
 */
router.post('/response', auth, validate(responseSchema), async (req, res) => {
  try {
    const { followUpId, responseContent, sentiment, actionTaken, conversionValue } = req.body;
    
    const followUp = await followUpService.recordFollowUpResponse(
      followUpId,
      responseContent,
      sentiment
    );
    
    // Registrar conversión si se proporcionó valor
    if (conversionValue && conversionValue > 0) {
      followUp.recordConversion(conversionValue);
      await followUp.save();
    }
    
    res.json({
      success: true,
      data: {
        followUpId: followUp.followUpId,
        customerResponded: followUp.response.customerResponded,
        responseDate: followUp.response.responseDate,
        sentiment: followUp.response.sentiment,
        conversionAchieved: followUp.response.conversionAchieved
      }
    });
    
  } catch (error) {
    logger.error('Error registrando respuesta:', error);
    res.status(500).json({
      success: false,
      error: 'Error registrando respuesta del seguimiento'
    });
  }
});

/**
 * @route PUT /api/followup/:followUpId/cancel
 * @desc Cancelar un seguimiento
 * @access Private
 */
router.put('/:followUpId/cancel', auth, async (req, res) => {
  try {
    const { followUpId } = req.params;
    const { reason } = req.body;
    
    const followUp = await FollowUp.findOne({ followUpId });
    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Seguimiento no encontrado'
      });
    }
    
    if (followUp.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden cancelar seguimientos pendientes'
      });
    }
    
    followUp.status = 'cancelled';
    followUp.execution.errorMessage = reason || 'Cancelado manualmente';
    await followUp.save();
    
    res.json({
      success: true,
      data: {
        followUpId: followUp.followUpId,
        status: followUp.status,
        cancelledAt: new Date()
      }
    });
    
  } catch (error) {
    logger.error('Error cancelando seguimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error cancelando seguimiento'
    });
  }
});

/**
 * @route GET /api/followup/metrics
 * @desc Obtener métricas de seguimientos
 * @access Private
 */
router.get('/metrics', auth, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const type = req.query.type;
    
    const metrics = await followUpService.getFollowUpMetrics(startDate, endDate, type);
    
    // Obtener métricas generales
    const generalMetrics = await FollowUp.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = {};
    generalMetrics.forEach(metric => {
      statusCounts[metric._id] = metric.count;
    });
    
    res.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate
        },
        byType: metrics,
        byStatus: statusCounts,
        summary: {
          totalFollowUps: Object.values(statusCounts).reduce((a, b) => a + b, 0),
          completedFollowUps: statusCounts.completed || 0,
          pendingFollowUps: statusCounts.pending || 0,
          failedFollowUps: statusCounts.failed || 0
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de seguimientos'
    });
  }
});

/**
 * @route GET /api/followup/overdue
 * @desc Obtener seguimientos vencidos
 * @access Private
 */
router.get('/overdue', auth, async (req, res) => {
  try {
    const overdueFollowUps = await FollowUp.getOverdueFollowUps();
    
    res.json({
      success: true,
      data: {
        followUps: overdueFollowUps,
        total: overdueFollowUps.length
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo seguimientos vencidos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo seguimientos vencidos'
    });
  }
});

/**
 * @route POST /api/followup/bulk-schedule
 * @desc Programar seguimientos en lote
 * @access Private
 */
router.post('/bulk-schedule', auth, async (req, res) => {
  try {
    const { customerIds, type, delayHours, context } = req.body;
    
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un array de customerIds'
      });
    }
    
    const results = [];
    const errors = [];
    
    for (const customerId of customerIds) {
      try {
        const followUp = await followUpService.scheduleFollowUp(
          customerId,
          type,
          delayHours,
          context
        );
        results.push({
          customerId,
          followUpId: followUp.followUpId,
          success: true
        });
      } catch (error) {
        errors.push({
          customerId,
          error: error.message,
          success: false
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        scheduled: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
    
  } catch (error) {
    logger.error('Error en programación en lote:', error);
    res.status(500).json({
      success: false,
      error: 'Error programando seguimientos en lote'
    });
  }
});

/**
 * @route GET /api/followup/:followUpId
 * @desc Obtener detalles de un seguimiento específico
 * @access Private
 */
router.get('/:followUpId', auth, async (req, res) => {
  try {
    const { followUpId } = req.params;
    
    const followUp = await FollowUp.findOne({ followUpId })
      .populate('customerId', 'name email phone profile');
    
    if (!followUp) {
      return res.status(404).json({
        success: false,
        error: 'Seguimiento no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: followUp
    });
    
  } catch (error) {
    logger.error('Error obteniendo seguimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo detalles del seguimiento'
    });
  }
});

module.exports = router;