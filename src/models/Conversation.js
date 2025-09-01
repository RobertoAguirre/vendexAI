const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    sentiment: {
      type: String,
      enum: ['very_negative', 'negative', 'neutral', 'positive', 'very_positive']
    },
    confidence: Number,
    intent: {
      type: String,
      enum: ['inquiry', 'purchase_intent', 'objection', 'support', 'complaint', 'compliment']
    },
    entities: [{
      entityType: String,
      value: String,
      confidence: Number
    }],
    responseTime: Number // tiempo en segundos
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    index: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  customerId: {
    type: String,
    required: true,
    ref: 'Customer',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },
  context: {
    currentTopic: String,
    productsDiscussed: [{
      productId: String,
      interest_level: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      objections: [String],
      timestamp: Date
    }],
    customerNeeds: [String],
    budget: {
      mentioned: Boolean,
      range: {
        min: Number,
        max: Number
      }
    },
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    stage: {
      type: String,
      enum: ['awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase'],
      default: 'awareness'
    }
  },
  messages: [messageSchema],
  salesMetrics: {
    leadScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },
    conversionProbability: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    estimatedValue: {
      type: Number,
      default: 0
    },
    nextBestAction: String,
    followUpScheduled: {
      type: Boolean,
      default: false
    }
  },
  summary: {
    keyPoints: [String],
    customerConcerns: [String],
    opportunitiesIdentified: [String],
    nextSteps: [String],
    lastUpdated: Date
  },
  channel: {
    type: String,
    enum: ['web', 'whatsapp', 'email', 'phone', 'chat'],
    default: 'web'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
conversationSchema.index({ businessId: 1, customerId: 1, createdAt: -1 });
conversationSchema.index({ businessId: 1, status: 1 });
conversationSchema.index({ businessId: 1, 'context.stage': 1 });
conversationSchema.index({ businessId: 1, 'salesMetrics.leadScore': -1 });
conversationSchema.index({ businessId: 1, conversationId: 1 }, { unique: true });

// Métodos del modelo
conversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    metadata,
    timestamp: new Date()
  });
  
  // Actualizar última actividad
  this.updatedAt = new Date();
  
  // Mantener solo los últimos 100 mensajes para performance
  if (this.messages.length > 100) {
    this.messages = this.messages.slice(-100);
  }
};

conversationSchema.methods.updateContext = function(updates) {
  Object.assign(this.context, updates);
  this.markModified('context');
};

conversationSchema.methods.calculateLeadScore = function() {
  let score = 50; // base score
  
  // Factores del contexto
  if (this.context.stage === 'intent') score += 20;
  if (this.context.stage === 'evaluation') score += 30;
  if (this.context.stage === 'purchase') score += 40;
  
  if (this.context.urgency === 'high') score += 15;
  if (this.context.urgency === 'medium') score += 5;
  
  if (this.context.budget.mentioned) score += 10;
  
  // Factores de los productos discutidos
  const highInterestProducts = this.context.productsDiscussed.filter(p => p.interest_level === 'high');
  score += highInterestProducts.length * 10;
  
  // Factores de mensajes
  const recentMessages = this.messages.slice(-10);
  const positiveMessages = recentMessages.filter(m => 
    m.metadata.sentiment === 'positive' || m.metadata.sentiment === 'very_positive'
  );
  score += positiveMessages.length * 2;
  
  const purchaseIntentMessages = recentMessages.filter(m => 
    m.metadata.intent === 'purchase_intent'
  );
  score += purchaseIntentMessages.length * 15;
  
  this.salesMetrics.leadScore = Math.max(0, Math.min(100, score));
  return this.salesMetrics.leadScore;
};

conversationSchema.methods.updateSalesMetrics = function() {
  this.calculateLeadScore();
  
  // Calcular probabilidad de conversión basada en lead score
  this.salesMetrics.conversionProbability = this.salesMetrics.leadScore / 100;
  
  // Estimar valor basado en productos discutidos
  let estimatedValue = 0;
  this.context.productsDiscussed.forEach(product => {
    if (product.interest_level === 'high') {
      estimatedValue += 1000; // valor estimado por producto de alto interés
    } else if (product.interest_level === 'medium') {
      estimatedValue += 500;
    }
  });
  this.salesMetrics.estimatedValue = estimatedValue;
  
  // Determinar siguiente mejor acción
  if (this.salesMetrics.leadScore > 80) {
    this.salesMetrics.nextBestAction = 'close_sale';
  } else if (this.salesMetrics.leadScore > 60) {
    this.salesMetrics.nextBestAction = 'send_proposal';
  } else if (this.salesMetrics.leadScore > 40) {
    this.salesMetrics.nextBestAction = 'nurture_lead';
  } else {
    this.salesMetrics.nextBestAction = 'gather_information';
  }
};

conversationSchema.methods.generateSummary = function() {
  const recentMessages = this.messages.slice(-20);
  
  // Extraer puntos clave (simplificado)
  const keyPoints = [];
  const customerConcerns = [];
  const opportunities = [];
  
  recentMessages.forEach(message => {
    if (message.metadata.intent === 'objection') {
      customerConcerns.push(message.content.substring(0, 100));
    }
    if (message.metadata.intent === 'purchase_intent') {
      opportunities.push('Interés de compra detectado');
    }
  });
  
  this.summary = {
    keyPoints,
    customerConcerns,
    opportunitiesIdentified: opportunities,
    nextSteps: [this.salesMetrics.nextBestAction],
    lastUpdated: new Date()
  };
};

module.exports = mongoose.model('Conversation', conversationSchema);