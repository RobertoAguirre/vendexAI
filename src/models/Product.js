const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  aiOptimizedDescription: {
    type: String, // Descripción optimizada para el asistente AI
    required: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subcategory: String,
  pricing: {
    basePrice: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    discounts: [{
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'bulk']
      },
      value: Number,
      minQuantity: Number,
      validUntil: Date,
      conditions: String
    }],
    compareAtPrice: Number // precio de comparación
  },
  features: [{
    name: String,
    description: String,
    benefit: String, // beneficio para el cliente
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  specifications: {
    technical: Map, // especificaciones técnicas flexibles
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number,
      unit: String
    }
  },
  inventory: {
    available: {
      type: Boolean,
      default: true
    },
    stock: {
      type: Number,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    }
  },
  salesData: {
    totalSold: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },
  aiInsights: {
    commonObjections: [{
      objection: String,
      response: String,
      effectiveness: Number
    }],
    bestSellingPoints: [String],
    targetCustomerProfile: {
      demographics: [String],
      painPoints: [String],
      motivations: [String]
    },
    competitiveAdvantages: [String],
    upsellOpportunities: [String], // IDs de productos relacionados
    crossSellOpportunities: [String]
  },
  content: {
    images: [String],
    videos: [String],
    documents: [String],
    testimonials: [{
      customer: String,
      content: String,
      rating: Number,
      verified: Boolean,
      date: Date
    }]
  },
  seo: {
    keywords: [String],
    tags: [String]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued', 'coming_soon'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
productSchema.index({ category: 1, status: 1 });
productSchema.index({ 'pricing.basePrice': 1 });
productSchema.index({ 'salesData.conversionRate': -1 });
productSchema.index({ 'inventory.available': 1 });
productSchema.index({ name: 'text', description: 'text', aiOptimizedDescription: 'text' });

// Métodos del modelo
productSchema.methods.calculateDiscountedPrice = function(quantity = 1) {
  let finalPrice = this.pricing.basePrice;
  let applicableDiscount = null;
  
  // Encontrar el mejor descuento aplicable
  const validDiscounts = this.pricing.discounts.filter(discount => {
    const isValid = !discount.validUntil || discount.validUntil > new Date();
    const meetsQuantity = !discount.minQuantity || quantity >= discount.minQuantity;
    return isValid && meetsQuantity;
  });
  
  if (validDiscounts.length > 0) {
    // Ordenar por mejor descuento
    validDiscounts.sort((a, b) => {
      const discountA = a.type === 'percentage' ? (finalPrice * a.value / 100) : a.value;
      const discountB = b.type === 'percentage' ? (finalPrice * b.value / 100) : b.value;
      return discountB - discountA;
    });
    
    applicableDiscount = validDiscounts[0];
    
    if (applicableDiscount.type === 'percentage') {
      finalPrice = finalPrice * (1 - applicableDiscount.value / 100);
    } else if (applicableDiscount.type === 'fixed') {
      finalPrice = Math.max(0, finalPrice - applicableDiscount.value);
    }
  }
  
  return {
    originalPrice: this.pricing.basePrice,
    finalPrice: Math.round(finalPrice * 100) / 100,
    discount: applicableDiscount,
    savings: this.pricing.basePrice - finalPrice
  };
};

productSchema.methods.isLowStock = function() {
  return this.inventory.stock <= this.inventory.lowStockThreshold;
};

productSchema.methods.updateSalesData = function(quantity, revenue, rating = null) {
  this.salesData.totalSold += quantity;
  this.salesData.revenue += revenue;
  
  if (rating !== null) {
    const totalRating = this.salesData.averageRating * this.salesData.reviewCount + rating;
    this.salesData.reviewCount += 1;
    this.salesData.averageRating = totalRating / this.salesData.reviewCount;
  }
};

productSchema.methods.getSellingPoints = function(customerProfile = {}) {
  let sellingPoints = [...this.aiInsights.bestSellingPoints];
  
  // Personalizar puntos de venta basado en el perfil del cliente
  if (customerProfile.painPoints) {
    this.features.forEach(feature => {
      if (customerProfile.painPoints.some(pain => 
        feature.benefit.toLowerCase().includes(pain.toLowerCase())
      )) {
        sellingPoints.unshift(feature.benefit);
      }
    });
  }
  
  // Remover duplicados y limitar a top 5
  return [...new Set(sellingPoints)].slice(0, 5);
};

productSchema.methods.getObjectionResponse = function(objection) {
  const matchingObjection = this.aiInsights.commonObjections.find(obj => 
    objection.toLowerCase().includes(obj.objection.toLowerCase()) ||
    obj.objection.toLowerCase().includes(objection.toLowerCase())
  );
  
  return matchingObjection ? matchingObjection.response : null;
};

// Método estático para buscar productos
productSchema.statics.searchProducts = function(query, filters = {}) {
  const searchQuery = {
    status: 'active',
    'inventory.available': true,
    ...filters
  };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  return this.find(searchQuery)
    .sort({ score: { $meta: 'textScore' }, 'salesData.conversionRate': -1 })
    .limit(20);
};

module.exports = mongoose.model('Product', productSchema);