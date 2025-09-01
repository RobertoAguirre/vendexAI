const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  businessId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  industry: {
    type: String,
    required: true,
    enum: ['technology', 'flowers', 'clothing', 'food', 'services', 'other']
  },
  contact: {
    email: String,
    phone: String,
    address: String,
    website: String
  },
  settings: {
    currency: {
      type: String,
      default: 'MXN'
    },
    timezone: {
      type: String,
      default: 'America/Mexico_City'
    },
    language: {
      type: String,
      default: 'es'
    }
  },
  apiKeys: {
    vendexApiKey: String,
    webhookUrl: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'pending'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    features: [String]
  }
}, {
  timestamps: true
});

// Índices
businessSchema.index({ industry: 1, status: 1 });
businessSchema.index({ 'settings.language': 1 });

// Métodos del modelo
businessSchema.methods.isActive = function() {
  return this.status === 'active';
};

businessSchema.methods.hasValidSubscription = function() {
  if (!this.subscription.endDate) return true;
  return this.subscription.endDate > new Date();
};

module.exports = mongoose.model('Business', businessSchema);
