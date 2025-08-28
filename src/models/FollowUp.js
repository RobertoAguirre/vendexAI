const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
  followUpId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    ref: 'Customer',
    index: true
  },
  conversationId: {
    type: String,
    ref: 'Conversation'
  },
  type: {
    type: String,
    enum: [
      'post_interaction',
      'abandoned_cart',
      'post_purchase',
      'nurture',
      'reactivation',
      'upsell',
      'feedback_request',
      'appointment_reminder'
    ],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  scheduledFor: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  content: {
    subject: String,
    message: {
      type: String,
      required: true
    },
    personalizedMessage: String, // mensaje personalizado por AI
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'call', 'in_app'],
      default: 'email'
    },
    attachments: [String]
  },
  context: {
    triggerEvent: String,
    relatedProducts: [String],
    customerSegment: String,
    previousInteractions: Number,
    lastPurchaseAmount: Number,
    reasonForFollowUp: String
  },
  automation: {
    isAutomated: {
      type: Boolean,
      default: true
    },
    templateId: String,
    aiGenerated: {
      type: Boolean,
      default: false
    },
    personalizationLevel: {
      type: String,
      enum: ['basic', 'medium', 'high'],
      default: 'medium'
    }
  },
  execution: {
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    lastAttempt: Date,
    nextRetry: Date,
    executedAt: Date,
    executedBy: String, // 'system' o ID del usuario
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']
    },
    errorMessage: String
  },
  response: {
    customerResponded: {
      type: Boolean,
      default: false
    },
    responseDate: Date,
    responseContent: String,
    sentiment: {
      type: String,
      enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    },
    actionTaken: String,
    conversionAchieved: {
      type: Boolean,
      default: false
    },
    conversionValue: Number
  },
  metrics: {
    openRate: Number,
    clickRate: Number,
    responseRate: Number,
    conversionRate: Number,
    roi: Number
  },
  nextFollowUp: {
    scheduled: {
      type: Boolean,
      default: false
    },
    followUpId: String,
    scheduledFor: Date,
    type: String
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
followUpSchema.index({ scheduledFor: 1, status: 1 });
followUpSchema.index({ customerId: 1, createdAt: -1 });
followUpSchema.index({ type: 1, status: 1 });
followUpSchema.index({ 'execution.deliveryStatus': 1 });

// Métodos del modelo
followUpSchema.methods.markAsExecuted = function(deliveryStatus = 'sent', executedBy = 'system') {
  this.status = 'completed';
  this.execution.executedAt = new Date();
  this.execution.executedBy = executedBy;
  this.execution.deliveryStatus = deliveryStatus;
  this.execution.attempts += 1;
};

followUpSchema.methods.markAsFailed = function(errorMessage) {
  this.execution.attempts += 1;
  this.execution.lastAttempt = new Date();
  this.execution.errorMessage = errorMessage;
  
  if (this.execution.attempts >= this.execution.maxAttempts) {
    this.status = 'failed';
  } else {
    // Programar reintento con backoff exponencial
    const retryDelay = Math.pow(2, this.execution.attempts) * 60 * 1000; // minutos
    this.execution.nextRetry = new Date(Date.now() + retryDelay);
  }
};

followUpSchema.methods.recordResponse = function(responseContent, sentiment, actionTaken = null) {
  this.response.customerResponded = true;
  this.response.responseDate = new Date();
  this.response.responseContent = responseContent;
  this.response.sentiment = sentiment;
  if (actionTaken) {
    this.response.actionTaken = actionTaken;
  }
};

followUpSchema.methods.recordConversion = function(conversionValue = 0) {
  this.response.conversionAchieved = true;
  this.response.conversionValue = conversionValue;
};

followUpSchema.methods.scheduleNextFollowUp = function(type, delayDays = 3) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + delayDays);
  
  this.nextFollowUp = {
    scheduled: true,
    scheduledFor: nextDate,
    type: type
  };
};

// Métodos estáticos
followUpSchema.statics.getPendingFollowUps = function(limit = 100) {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  })
  .sort({ priority: -1, scheduledFor: 1 })
  .limit(limit);
};

followUpSchema.statics.getOverdueFollowUps = function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.find({
    status: 'pending',
    scheduledFor: { $lt: oneDayAgo }
  });
};

followUpSchema.statics.getFollowUpsByCustomer = function(customerId, limit = 10) {
  return this.find({ customerId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

followUpSchema.statics.getMetricsByType = function(type, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        type: type,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: 1 },
        totalResponded: { $sum: { $cond: ['$response.customerResponded', 1, 0] } },
        totalConverted: { $sum: { $cond: ['$response.conversionAchieved', 1, 0] } },
        totalRevenue: { $sum: '$response.conversionValue' },
        avgResponseTime: { $avg: { $subtract: ['$response.responseDate', '$execution.executedAt'] } }
      }
    },
    {
      $project: {
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
};

module.exports = mongoose.model('FollowUp', followUpSchema);