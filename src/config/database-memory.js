// Base de datos en memoria para demo sin MongoDB
const logger = require('../utils/logger');

// Simulación de colecciones en memoria
const memoryDB = {
  customers: new Map(),
  conversations: new Map(),
  products: new Map(),
  followups: new Map()
};

// Simulación de ObjectId
let idCounter = 1;
const generateId = () => `demo_${idCounter++}`;

// Simulación de modelo Customer
class MemoryCustomer {
  constructor(data) {
    this.customerId = data.customerId;
    this.name = data.name || `Cliente ${data.customerId}`;
    this.email = data.email || `${data.customerId}@demo.com`;
    this.phone = data.phone;
    this.preferences = data.preferences || {};
    this.profile = data.profile || { customerType: 'new', lifetimeValue: 0, totalPurchases: 0 };
    this.behavior = data.behavior || { engagementLevel: 'medium', conversionProbability: 0.5, interactionCount: 0 };
    this.sentiment = data.sentiment || { overall: 'neutral', history: [] };
    this.tags = data.tags || [];
    this.notes = data.notes || [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async save() {
    this.updatedAt = new Date();
    memoryDB.customers.set(this.customerId, this);
    return this;
  }

  updateSentiment(sentiment, confidence) {
    this.sentiment.overall = sentiment;
    this.sentiment.lastAnalysis = new Date();
    this.sentiment.history.push({
      sentiment,
      confidence,
      timestamp: new Date()
    });
    
    if (this.sentiment.history.length > 50) {
      this.sentiment.history = this.sentiment.history.slice(-50);
    }
  }

  updateBehavior(responseTime, engagementLevel) {
    this.behavior.responseTime = responseTime;
    this.behavior.engagementLevel = engagementLevel;
    this.behavior.lastInteraction = new Date();
    this.behavior.interactionCount += 1;
  }

  calculateConversionProbability() {
    let probability = 0.5;
    
    if (this.sentiment.overall === 'positive') probability += 0.2;
    if (this.sentiment.overall === 'very_positive') probability += 0.3;
    if (this.behavior.engagementLevel === 'high') probability += 0.2;
    if (this.profile.totalPurchases > 0) probability += 0.1;
    
    if (this.sentiment.overall === 'negative') probability -= 0.2;
    if (this.sentiment.overall === 'very_negative') probability -= 0.3;
    if (this.behavior.engagementLevel === 'low') probability -= 0.1;
    
    this.behavior.conversionProbability = Math.max(0, Math.min(1, probability));
    return this.behavior.conversionProbability;
  }

  static async findOne(query) {
    if (query.customerId) {
      return memoryDB.customers.get(query.customerId) || null;
    }
    return null;
  }

  static async find(query = {}) {
    return Array.from(memoryDB.customers.values());
  }
}

// Simulación de modelo Conversation
class MemoryConversation {
  constructor(data) {
    this.conversationId = data.conversationId;
    this.customerId = data.customerId;
    this.status = data.status || 'active';
    this.context = data.context || { stage: 'awareness', urgency: 'medium', productsDiscussed: [], customerNeeds: [] };
    this.messages = data.messages || [];
    this.salesMetrics = data.salesMetrics || { leadScore: 50, conversionProbability: 0.5, estimatedValue: 0 };
    this.summary = data.summary || { keyPoints: [], customerConcerns: [], opportunitiesIdentified: [], nextSteps: [] };
    this.channel = data.channel || 'web';
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  addMessage(role, content, metadata = {}) {
    this.messages.push({
      role,
      content,
      metadata,
      timestamp: new Date()
    });
    
    this.updatedAt = new Date();
    
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
  }

  updateContext(updates) {
    Object.assign(this.context, updates);
  }

  calculateLeadScore() {
    let score = 50;
    
    if (this.context.stage === 'intent') score += 20;
    if (this.context.stage === 'evaluation') score += 30;
    if (this.context.stage === 'purchase') score += 40;
    
    if (this.context.urgency === 'high') score += 15;
    if (this.context.urgency === 'medium') score += 5;
    
    const recentMessages = this.messages.slice(-10);
    const positiveMessages = recentMessages.filter(m => 
      m.metadata.sentiment === 'positive' || m.metadata.sentiment === 'very_positive'
    );
    score += positiveMessages.length * 2;
    
    this.salesMetrics.leadScore = Math.max(0, Math.min(100, score));
    return this.salesMetrics.leadScore;
  }

  updateSalesMetrics() {
    this.calculateLeadScore();
    this.salesMetrics.conversionProbability = this.salesMetrics.leadScore / 100;
  }

  generateSummary() {
    // Simplificado para demo
    this.summary.lastUpdated = new Date();
  }

  markModified() {
    // No-op para compatibilidad con Mongoose
  }

  async save() {
    this.updatedAt = new Date();
    memoryDB.conversations.set(this.conversationId, this);
    return this;
  }

  static async findOne(query) {
    if (query.conversationId) {
      return memoryDB.conversations.get(query.conversationId) || null;
    }
    if (query.customerId) {
      const conversations = Array.from(memoryDB.conversations.values());
      return conversations.find(c => c.customerId === query.customerId && c.status === 'active') || null;
    }
    return null;
  }

  static async find(query = {}) {
    let conversations = Array.from(memoryDB.conversations.values());
    
    if (query.customerId) {
      conversations = conversations.filter(c => c.customerId === query.customerId);
    }
    if (query.status) {
      conversations = conversations.filter(c => c.status === query.status);
    }
    
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async countDocuments(query = {}) {
    const conversations = await this.find(query);
    return conversations.length;
  }

  static async aggregate(pipeline) {
    // Simulación básica de agregación para dashboard
    const conversations = Array.from(memoryDB.conversations.values());
    
    // Para el dashboard, retornar datos de ejemplo
    return [{
      totalConversations: conversations.length,
      avgLeadScore: conversations.length > 0 ? 
        conversations.reduce((sum, c) => sum + c.salesMetrics.leadScore, 0) / conversations.length : 0,
      avgConversionProbability: conversations.length > 0 ?
        conversations.reduce((sum, c) => sum + c.salesMetrics.conversionProbability, 0) / conversations.length : 0,
      totalEstimatedValue: conversations.reduce((sum, c) => sum + (c.salesMetrics.estimatedValue || 0), 0),
      highQualityLeads: conversations.filter(c => c.salesMetrics.leadScore >= 70).length,
      conversationsInPurchaseStage: conversations.filter(c => c.context.stage === 'purchase').length
    }];
  }
}

// Simulación de modelo Product
class MemoryProduct {
  constructor(data) {
    Object.assign(this, data);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  calculateDiscountedPrice(quantity = 1) {
    let finalPrice = this.pricing.basePrice;
    let applicableDiscount = null;
    
    const validDiscounts = (this.pricing.discounts || []).filter(discount => {
      const isValid = !discount.validUntil || new Date(discount.validUntil) > new Date();
      const meetsQuantity = !discount.minQuantity || quantity >= discount.minQuantity;
      return isValid && meetsQuantity;
    });
    
    if (validDiscounts.length > 0) {
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
  }

  async save() {
    this.updatedAt = new Date();
    memoryDB.products.set(this.productId, this);
    return this;
  }

  static async find(query = {}) {
    let products = Array.from(memoryDB.products.values());
    
    if (query.status) {
      products = products.filter(p => p.status === query.status);
    }
    if (query.$text && query.$text.$search) {
      const searchTerm = query.$text.$search.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        (p.aiOptimizedDescription && p.aiOptimizedDescription.toLowerCase().includes(searchTerm))
      );
    }
    
    return products;
  }

  static async findOne(query) {
    if (query.productId) {
      return memoryDB.products.get(query.productId) || null;
    }
    return null;
  }

  static async searchProducts(query, filters = {}) {
    let products = Array.from(memoryDB.products.values());
    
    // Aplicar filtros
    if (filters.status) {
      products = products.filter(p => p.status === filters.status);
    }
    if (filters['inventory.available']) {
      products = products.filter(p => p.inventory && p.inventory.available);
    }
    
    // Búsqueda de texto
    if (query) {
      const searchTerm = query.toLowerCase();
      products = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        (p.aiOptimizedDescription && p.aiOptimizedDescription.toLowerCase().includes(searchTerm))
      );
    }
    
    return products.slice(0, 20);
  }

  static async insertMany(products) {
    products.forEach(productData => {
      const product = new MemoryProduct(productData);
      memoryDB.products.set(product.productId, product);
    });
    return products;
  }

  static async deleteMany() {
    memoryDB.products.clear();
    return { deletedCount: memoryDB.products.size };
  }

  static async countDocuments(query = {}) {
    const products = await this.find(query);
    return products.length;
  }
}

const connectMemoryDB = async () => {
  logger.info('📦 Usando base de datos en memoria para demo');
  
  // Exportar modelos simulados
  global.Customer = MemoryCustomer;
  global.Conversation = MemoryConversation;
  global.Product = MemoryProduct;
  
  return true;
};

module.exports = connectMemoryDB;