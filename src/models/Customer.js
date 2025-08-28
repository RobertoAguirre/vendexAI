const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: {
    type: String
  },
  preferences: {
    communicationStyle: {
      type: String,
      enum: ['formal', 'casual', 'technical', 'emotional'],
      default: 'casual'
    },
    preferredProducts: [String],
    budgetRange: {
      min: Number,
      max: Number
    },
    interests: [String],
    painPoints: [String]
  },
  profile: {
    customerType: {
      type: String,
      enum: ['new', 'returning', 'vip', 'at_risk'],
      default: 'new'
    },
    lifetimeValue: {
      type: Number,
      default: 0
    },
    totalPurchases: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    },
    lastPurchaseDate: Date,
    acquisitionDate: {
      type: Date,
      default: Date.now
    }
  },
  behavior: {
    responseTime: {
      type: Number, // promedio en minutos
      default: 0
    },
    engagementLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    conversionProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    lastInteraction: Date,
    interactionCount: {
      type: Number,
      default: 0
    }
  },
  sentiment: {
    overall: {
      type: String,
      enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'],
      default: 'neutral'
    },
    lastAnalysis: Date,
    history: [{
      sentiment: String,
      confidence: Number,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  tags: [String],
  notes: [{
    content: String,
    author: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Índices para optimizar consultas
customerSchema.index({ email: 1 });
customerSchema.index({ 'profile.customerType': 1 });
customerSchema.index({ 'behavior.lastInteraction': 1 });
customerSchema.index({ 'behavior.conversionProbability': -1 });

// Métodos del modelo
customerSchema.methods.updateSentiment = function(sentiment, confidence) {
  this.sentiment.overall = sentiment;
  this.sentiment.lastAnalysis = new Date();
  this.sentiment.history.push({
    sentiment,
    confidence,
    timestamp: new Date()
  });
  
  // Mantener solo los últimos 50 análisis
  if (this.sentiment.history.length > 50) {
    this.sentiment.history = this.sentiment.history.slice(-50);
  }
};

customerSchema.methods.updateBehavior = function(responseTime, engagementLevel) {
  this.behavior.responseTime = responseTime;
  this.behavior.engagementLevel = engagementLevel;
  this.behavior.lastInteraction = new Date();
  this.behavior.interactionCount += 1;
};

customerSchema.methods.calculateConversionProbability = function() {
  let probability = 0.5; // base
  
  // Factores positivos
  if (this.sentiment.overall === 'positive') probability += 0.2;
  if (this.sentiment.overall === 'very_positive') probability += 0.3;
  if (this.behavior.engagementLevel === 'high') probability += 0.2;
  if (this.profile.totalPurchases > 0) probability += 0.1;
  
  // Factores negativos
  if (this.sentiment.overall === 'negative') probability -= 0.2;
  if (this.sentiment.overall === 'very_negative') probability -= 0.3;
  if (this.behavior.engagementLevel === 'low') probability -= 0.1;
  
  this.behavior.conversionProbability = Math.max(0, Math.min(1, probability));
  return this.behavior.conversionProbability;
};

module.exports = mongoose.model('Customer', customerSchema);