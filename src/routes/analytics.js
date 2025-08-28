const express = require('express');
const Conversation = require('../models/Conversation');
const Customer = require('../models/Customer');
const FollowUp = require('../models/FollowUp');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route GET /api/analytics/sales
 * @desc Obtener métricas de ventas del asistente
 * @access Private
 */
router.get('/sales', auth, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Métricas de conversaciones
    const conversationMetrics = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          avgLeadScore: { $avg: '$salesMetrics.leadScore' },
          avgConversionProbability: { $avg: '$salesMetrics.conversionProbability' },
          totalEstimatedValue: { $sum: '$salesMetrics.estimatedValue' },
          highQualityLeads: {
            $sum: { $cond: [{ $gte: ['$salesMetrics.leadScore', 70] }, 1, 0] }
          },
          conversationsInPurchaseStage: {
            $sum: { $cond: [{ $eq: ['$context.stage', 'purchase'] }, 1, 0] }
          }
        }
      }
    ]);

    // Métricas por etapa de conversación
    const stageMetrics = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$context.stage',
          count: { $sum: 1 },
          avgLeadScore: { $avg: '$salesMetrics.leadScore' },
          avgEstimatedValue: { $avg: '$salesMetrics.estimatedValue' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Métricas de sentimiento
    const sentimentMetrics = await Customer.aggregate([
      {
        $match: {
          'behavior.lastInteraction': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$sentiment.overall',
          count: { $sum: 1 },
          avgConversionProbability: { $avg: '$behavior.conversionProbability' }
        }
      }
    ]);

    // Tendencias diarias
    const dailyTrends = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          conversations: { $sum: 1 },
          avgLeadScore: { $avg: '$salesMetrics.leadScore' },
          highQualityLeads: {
            $sum: { $cond: [{ $gte: ['$salesMetrics.leadScore', 70] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    const metrics = conversationMetrics[0] || {
      totalConversations: 0,
      avgLeadScore: 0,
      avgConversionProbability: 0,
      totalEstimatedValue: 0,
      highQualityLeads: 0,
      conversationsInPurchaseStage: 0
    };

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        overview: {
          ...metrics,
          conversionRate: metrics.totalConversations > 0 
            ? (metrics.conversationsInPurchaseStage / metrics.totalConversations * 100).toFixed(2)
            : 0,
          leadQualityRate: metrics.totalConversations > 0
            ? (metrics.highQualityLeads / metrics.totalConversations * 100).toFixed(2)
            : 0
        },
        byStage: stageMetrics,
        bySentiment: sentimentMetrics,
        trends: dailyTrends
      }
    });

  } catch (error) {
    logger.error('Error obteniendo métricas de ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de ventas'
    });
  }
});

/**
 * @route GET /api/analytics/customers
 * @desc Obtener métricas de clientes
 * @access Private
 */
router.get('/customers', auth, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Métricas generales de clientes
    const customerMetrics = await Customer.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          newCustomers: {
            $sum: { $cond: [{ $eq: ['$profile.customerType', 'new'] }, 1, 0] }
          },
          returningCustomers: {
            $sum: { $cond: [{ $eq: ['$profile.customerType', 'returning'] }, 1, 0] }
          },
          vipCustomers: {
            $sum: { $cond: [{ $eq: ['$profile.customerType', 'vip'] }, 1, 0] }
          },
          avgLifetimeValue: { $avg: '$profile.lifetimeValue' },
          avgInteractionCount: { $avg: '$behavior.interactionCount' },
          avgConversionProbability: { $avg: '$behavior.conversionProbability' }
        }
      }
    ]);

    // Distribución por tipo de cliente
    const customerTypeDistribution = await Customer.aggregate([
      {
        $group: {
          _id: '$profile.customerType',
          count: { $sum: 1 },
          avgLifetimeValue: { $avg: '$profile.lifetimeValue' },
          avgConversionProbability: { $avg: '$behavior.conversionProbability' }
        }
      }
    ]);

    // Clientes más activos
    const topCustomers = await Customer.find({
      'behavior.lastInteraction': { $gte: startDate, $lte: endDate }
    })
    .sort({ 'behavior.interactionCount': -1, 'profile.lifetimeValue': -1 })
    .limit(10)
    .select('customerId name email profile behavior');

    // Análisis de engagement
    const engagementMetrics = await Customer.aggregate([
      {
        $group: {
          _id: '$behavior.engagementLevel',
          count: { $sum: 1 },
          avgConversionProbability: { $avg: '$behavior.conversionProbability' }
        }
      }
    ]);

    const metrics = customerMetrics[0] || {
      totalCustomers: 0,
      newCustomers: 0,
      returningCustomers: 0,
      vipCustomers: 0,
      avgLifetimeValue: 0,
      avgInteractionCount: 0,
      avgConversionProbability: 0
    };

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        overview: metrics,
        byType: customerTypeDistribution,
        byEngagement: engagementMetrics,
        topCustomers
      }
    });

  } catch (error) {
    logger.error('Error obteniendo métricas de clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de clientes'
    });
  }
});

/**
 * @route GET /api/analytics/performance
 * @desc Obtener métricas de rendimiento del asistente
 * @access Private
 */
router.get('/performance', auth, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Métricas de respuesta
    const responseMetrics = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$messages'
      },
      {
        $match: {
          'messages.role': 'assistant',
          'messages.metadata.responseTime': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          avgResponseTime: { $avg: '$messages.metadata.responseTime' },
          maxResponseTime: { $max: '$messages.metadata.responseTime' },
          minResponseTime: { $min: '$messages.metadata.responseTime' }
        }
      }
    ]);

    // Análisis de intenciones detectadas
    const intentAnalysis = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$messages'
      },
      {
        $match: {
          'messages.role': 'user',
          'messages.metadata.intent': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$messages.metadata.intent',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Análisis de sentimientos
    const sentimentAnalysis = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $unwind: '$messages'
      },
      {
        $match: {
          'messages.metadata.sentiment': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$messages.metadata.sentiment',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$messages.metadata.confidence' }
        }
      }
    ]);

    // Efectividad por canal
    const channelEffectiveness = await Conversation.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$channel',
          totalConversations: { $sum: 1 },
          avgLeadScore: { $avg: '$salesMetrics.leadScore' },
          avgConversionProbability: { $avg: '$salesMetrics.conversionProbability' },
          completedConversations: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          channel: '$_id',
          totalConversations: 1,
          avgLeadScore: 1,
          avgConversionProbability: 1,
          completionRate: {
            $divide: ['$completedConversations', '$totalConversations']
          }
        }
      }
    ]);

    const performance = responseMetrics[0] || {
      totalResponses: 0,
      avgResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: 0
    };

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        responseMetrics: performance,
        intentDistribution: intentAnalysis,
        sentimentDistribution: sentimentAnalysis,
        channelEffectiveness
      }
    });

  } catch (error) {
    logger.error('Error obteniendo métricas de rendimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de rendimiento'
    });
  }
});

/**
 * @route GET /api/analytics/dashboard
 * @desc Obtener datos para dashboard principal
 * @access Private
 */
router.get('/dashboard', auth, async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Métricas de hoy vs ayer
    const [todayMetrics, yesterdayMetrics] = await Promise.all([
      Conversation.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterday, $lte: today }
          }
        },
        {
          $group: {
            _id: null,
            conversations: { $sum: 1 },
            avgLeadScore: { $avg: '$salesMetrics.leadScore' },
            highQualityLeads: {
              $sum: { $cond: [{ $gte: ['$salesMetrics.leadScore', 70] }, 1, 0] }
            }
          }
        }
      ]),
      Conversation.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(yesterday.getTime() - 24 * 60 * 60 * 1000), $lt: yesterday }
          }
        },
        {
          $group: {
            _id: null,
            conversations: { $sum: 1 },
            avgLeadScore: { $avg: '$salesMetrics.leadScore' },
            highQualityLeads: {
              $sum: { $cond: [{ $gte: ['$salesMetrics.leadScore', 70] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    // Conversaciones activas
    const activeConversations = await Conversation.countDocuments({ status: 'active' });

    // Seguimientos pendientes
    const pendingFollowUps = await FollowUp.countDocuments({
      status: 'pending',
      scheduledFor: { $lte: today }
    });

    // Top clientes por probabilidad de conversión
    const topProspects = await Customer.find({
      'behavior.conversionProbability': { $gte: 0.7 }
    })
    .sort({ 'behavior.conversionProbability': -1 })
    .limit(5)
    .select('customerId name email behavior.conversionProbability profile.customerType');

    // Alertas (seguimientos vencidos, clientes de alto valor sin interacción, etc.)
    const overdueFollowUps = await FollowUp.countDocuments({
      status: 'pending',
      scheduledFor: { $lt: yesterday }
    });

    const inactiveVipCustomers = await Customer.countDocuments({
      'profile.customerType': 'vip',
      'behavior.lastInteraction': { $lt: lastWeek }
    });

    const todayData = todayMetrics[0] || { conversations: 0, avgLeadScore: 0, highQualityLeads: 0 };
    const yesterdayData = yesterdayMetrics[0] || { conversations: 0, avgLeadScore: 0, highQualityLeads: 0 };

    res.json({
      success: true,
      data: {
        summary: {
          todayConversations: todayData.conversations,
          conversationChange: todayData.conversations - yesterdayData.conversations,
          avgLeadScore: Math.round(todayData.avgLeadScore || 0),
          leadScoreChange: Math.round((todayData.avgLeadScore || 0) - (yesterdayData.avgLeadScore || 0)),
          activeConversations,
          pendingFollowUps
        },
        topProspects,
        alerts: {
          overdueFollowUps,
          inactiveVipCustomers,
          total: overdueFollowUps + inactiveVipCustomers
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo datos del dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo datos del dashboard'
    });
  }
});

module.exports = router;