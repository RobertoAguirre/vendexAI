// Modelos se cargan dinámicamente (MongoDB o memoria)
const getModels = () => ({
  Conversation: global.Conversation || require('../models/Conversation'),
  Customer: global.Customer || require('../models/Customer'),
  Product: global.Product || require('../models/Product')
});
const ClaudeService = require('./ClaudeService');
// Redis deshabilitado para demo
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class ConversationService {
  constructor() {
    this.claudeService = new ClaudeService();
    this.redis = null;
  }

  async initialize() {
    // Redis deshabilitado para demo - funcionando sin cache
    logger.info('ConversationService inicializado sin Redis');
  }

  async processMessage(customerId, message, channel = 'web') {
    try {
      // Obtener o crear cliente
      const { Customer } = getModels();
      let customer = await Customer.findOne({ customerId });
      if (!customer) {
        customer = await this.createNewCustomer(customerId, message);
      }

      // Obtener o crear conversación activa
      let conversation = await this.getActiveConversation(customerId);
      if (!conversation) {
        conversation = await this.createNewConversation(customerId, channel);
      }

      // Analizar sentimiento del mensaje del usuario
      const sentimentAnalysis = await this.claudeService.analyzeSentiment(message);
      
      // Agregar mensaje del usuario
      conversation.addMessage('user', message, {
        sentiment: sentimentAnalysis.sentiment,
        confidence: sentimentAnalysis.confidence,
        intent: this.detectIntent(message),
        responseTime: this.calculateResponseTime(conversation)
      });

      // Actualizar contexto basado en el mensaje
      await this.updateConversationContext(conversation, message, sentimentAnalysis);

      // Obtener productos relevantes si es necesario
      const relevantProducts = await this.getRelevantProducts(message, conversation.context);

      // Preparar contexto para Claude
      const context = {
        customer,
        conversation,
        products: relevantProducts
      };

      // Generar respuesta con Claude
      const response = await this.claudeService.generateResponse(
        conversation.messages,
        context
      );

      // Transformar entidades para que coincidan con el esquema
      const transformedMetadata = this.transformMetadata(response.metadata);
      
      // Agregar respuesta del asistente
      conversation.addMessage('assistant', response.content, transformedMetadata);

      // Actualizar métricas de ventas
      conversation.updateSalesMetrics();
      conversation.generateSummary();

      // Actualizar comportamiento del cliente
      customer.updateBehavior(
        response.metadata.responseTime || 0,
        this.determineEngagementLevel(conversation)
      );
      customer.updateSentiment(sentimentAnalysis.sentiment, sentimentAnalysis.confidence);
      customer.calculateConversionProbability();

      // Guardar cambios
      await Promise.all([
        conversation.save(),
        customer.save()
      ]);

      // Cache de la conversación
      await this.cacheConversation(conversation);

      // Determinar si necesita seguimiento
      const followUpNeeded = this.shouldScheduleFollowUp(conversation, response.metadata);
      
      return {
        conversationId: conversation.conversationId,
        message: response.content,
        metadata: {
          ...response.metadata,
          leadScore: conversation.salesMetrics.leadScore,
          conversionProbability: conversation.salesMetrics.conversionProbability,
          customerSentiment: customer.sentiment.overall,
          followUpNeeded
        },
        usage: response.usage
      };

    } catch (error) {
      logger.error('Error processing message:', error);
      throw error;
    }
  }

  async createNewCustomer(customerId, firstMessage) {
    const { Customer } = getModels();
    const customer = new Customer({
      customerId,
      name: `Cliente ${customerId.slice(-4)}`, // Nombre temporal
      email: `${customerId}@temp.com`, // Email temporal
      preferences: {
        communicationStyle: this.detectCommunicationStyle(firstMessage)
      },
      behavior: {
        lastInteraction: new Date(),
        interactionCount: 1
      }
    });

    await customer.save();
    logger.info(`Nuevo cliente creado: ${customerId}`);
    return customer;
  }

  async createNewConversation(customerId, channel) {
    const { Conversation } = getModels();
    const conversation = new Conversation({
      conversationId: uuidv4(),
      customerId,
      channel,
      context: {
        stage: 'awareness',
        urgency: 'medium',
        productsDiscussed: [],
        customerNeeds: []
      }
    });

    await conversation.save();
    logger.info(`Nueva conversación creada: ${conversation.conversationId}`);
    return conversation;
  }

  async getActiveConversation(customerId) {
    // Buscar conversación activa reciente (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { Conversation } = getModels();
    return await Conversation.findOne({
      customerId,
      status: 'active',
      updatedAt: { $gte: oneDayAgo }
    }).sort({ updatedAt: -1 });
  }

  async updateConversationContext(conversation, message, sentimentAnalysis) {
    const context = conversation.context;
    
    // Detectar productos mencionados
    const mentionedProducts = await this.detectMentionedProducts(message);
    mentionedProducts.forEach(productId => {
      const existing = context.productsDiscussed.find(p => p.productId === productId);
      if (existing) {
        existing.timestamp = new Date();
      } else {
        context.productsDiscussed.push({
          productId,
          interest_level: 'medium',
          timestamp: new Date()
        });
      }
    });

    // Detectar necesidades del cliente
    const detectedNeeds = this.extractCustomerNeeds(message);
    context.customerNeeds = [...new Set([...context.customerNeeds, ...detectedNeeds])];

    // Actualizar urgencia basada en el sentimiento y palabras clave
    if (this.containsUrgencyKeywords(message)) {
      context.urgency = 'high';
    }

    // Actualizar etapa de la conversación
    context.stage = this.determineConversationStage(conversation, message);

    // Detectar presupuesto mencionado
    const budgetMention = this.extractBudgetInfo(message);
    if (budgetMention) {
      context.budget = budgetMention;
    }

    conversation.markModified('context');
  }

  async getRelevantProducts(message, context) {
    try {
      // Buscar productos basados en el mensaje
      const { Product } = getModels();
      const searchResults = await Product.searchProducts(message);
      
      // Agregar productos ya discutidos en la conversación
      const discussedProductIds = context.productsDiscussed.map(p => p.productId);
      const discussedProducts = await Product.find({
        productId: { $in: discussedProductIds }
      });

      // Combinar y deduplicar
      const allProducts = [...searchResults, ...discussedProducts];
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.productId === product.productId)
      );

      return uniqueProducts.slice(0, 5); // Limitar a 5 productos más relevantes
    } catch (error) {
      logger.error('Error getting relevant products:', error);
      return [];
    }
  }

  detectIntent(message) {
    const lowerMessage = message.toLowerCase();
    
    // Palabras clave para diferentes intenciones
    const intentKeywords = {
      purchase_intent: ['comprar', 'precio', 'costo', 'cuánto', 'adquirir', 'pedido', 'orden'],
      objection: ['pero', 'sin embargo', 'problema', 'preocupa', 'duda', 'no estoy seguro'],
      support: ['ayuda', 'problema', 'error', 'no funciona', 'soporte', 'asistencia'],
      complaint: ['molesto', 'insatisfecho', 'mal servicio', 'problema', 'queja'],
      compliment: ['gracias', 'excelente', 'perfecto', 'me gusta', 'satisfecho']
    };

    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return intent;
      }
    }

    return 'inquiry'; // Por defecto
  }

  detectCommunicationStyle(message) {
    const formalWords = ['usted', 'señor', 'señora', 'estimado', 'cordialmente'];
    const casualWords = ['hola', 'hey', 'qué tal', 'buenas'];
    const technicalWords = ['especificaciones', 'características técnicas', 'rendimiento'];
    
    const lowerMessage = message.toLowerCase();
    
    if (formalWords.some(word => lowerMessage.includes(word))) {
      return 'formal';
    } else if (technicalWords.some(word => lowerMessage.includes(word))) {
      return 'technical';
    } else if (casualWords.some(word => lowerMessage.includes(word))) {
      return 'casual';
    }
    
    return 'casual'; // Por defecto
  }

  async detectMentionedProducts(message) {
    try {
      // Buscar productos que coincidan con palabras en el mensaje
      const { Product } = getModels();
      const products = await Product.find({
        $text: { $search: message }
      }).limit(5);
      
      return products.map(p => p.productId);
    } catch (error) {
      return [];
    }
  }

  extractCustomerNeeds(message) {
    const needsKeywords = {
      'ahorro de tiempo': ['rápido', 'tiempo', 'eficiente', 'automático'],
      'ahorro de dinero': ['barato', 'económico', 'descuento', 'precio'],
      'calidad': ['calidad', 'duradero', 'resistente', 'premium'],
      'facilidad de uso': ['fácil', 'simple', 'intuitivo', 'user-friendly']
    };

    const detectedNeeds = [];
    const lowerMessage = message.toLowerCase();

    for (const [need, keywords] of Object.entries(needsKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        detectedNeeds.push(need);
      }
    }

    return detectedNeeds;
  }

  containsUrgencyKeywords(message) {
    const urgencyWords = ['urgente', 'rápido', 'ya', 'inmediato', 'pronto', 'hoy'];
    return urgencyWords.some(word => message.toLowerCase().includes(word));
  }

  determineConversationStage(conversation, message) {
    const lowerMessage = message.toLowerCase();
    const currentStage = conversation.context.stage;

    // Palabras clave para cada etapa
    const stageKeywords = {
      awareness: ['información', 'qué es', 'cómo funciona'],
      interest: ['interesante', 'me gusta', 'cuéntame más'],
      consideration: ['comparar', 'opciones', 'alternativas'],
      intent: ['quiero', 'necesito', 'me interesa comprar'],
      evaluation: ['precio', 'costo', 'condiciones', 'garantía'],
      purchase: ['comprar', 'adquirir', 'pedido', 'orden']
    };

    // Progresión natural de etapas
    const stageProgression = ['awareness', 'interest', 'consideration', 'intent', 'evaluation', 'purchase'];
    const currentIndex = stageProgression.indexOf(currentStage);

    for (const [stage, keywords] of Object.entries(stageKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        const stageIndex = stageProgression.indexOf(stage);
        // Solo avanzar, no retroceder
        if (stageIndex > currentIndex) {
          return stage;
        }
      }
    }

    return currentStage;
  }

  extractBudgetInfo(message) {
    // Buscar menciones de números que podrían ser presupuesto
    const budgetRegex = /(\$?\d+(?:,\d{3})*(?:\.\d{2})?)/g;
    const matches = message.match(budgetRegex);
    
    if (matches && matches.length > 0) {
      const amount = parseFloat(matches[0].replace(/[$,]/g, ''));
      return {
        mentioned: true,
        range: {
          min: amount * 0.8, // Rango flexible
          max: amount * 1.2
        }
      };
    }
    
    return null;
  }

  calculateResponseTime(conversation) {
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const timeDiff = Date.now() - lastMessage.timestamp.getTime();
      return Math.round(timeDiff / 1000); // en segundos
    }
    return 0;
  }

  determineEngagementLevel(conversation) {
    const recentMessages = conversation.messages.slice(-10);
    const userMessages = recentMessages.filter(m => m.role === 'user');
    
    if (userMessages.length >= 5) return 'high';
    if (userMessages.length >= 2) return 'medium';
    return 'low';
  }

  shouldScheduleFollowUp(conversation, responseMetadata) {
    const leadScore = conversation.salesMetrics.leadScore;
    const stage = conversation.context.stage;
    const lastInteraction = conversation.updatedAt;
    
    // Programar seguimiento si:
    // 1. Lead score alto pero no compró
    // 2. Conversación abandonada en etapa avanzada
    // 3. Cliente mostró interés pero no respondió
    
    if (leadScore > 70 && stage !== 'purchase') {
      return {
        needed: true,
        type: 'nurture',
        delayHours: 24
      };
    }
    
    if (stage === 'evaluation' || stage === 'intent') {
      return {
        needed: true,
        type: 'post_interaction',
        delayHours: 72
      };
    }
    
    return { needed: false };
  }

  async cacheConversation(conversation) {
    if (!this.redis) return;
    
    try {
      const cacheKey = `conversation:${conversation.conversationId}`;
      const cacheData = {
        conversationId: conversation.conversationId,
        customerId: conversation.customerId,
        context: conversation.context,
        salesMetrics: conversation.salesMetrics,
        lastUpdate: conversation.updatedAt
      };
      
      await this.redis.setEx(cacheKey, 3600, JSON.stringify(cacheData)); // 1 hora
    } catch (error) {
      logger.warn('Error caching conversation:', error);
    }
  }

  async getConversationHistory(customerId, limit = 50) {
    try {
      const { Conversation } = getModels();
      const conversations = await Conversation.find({ customerId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select('conversationId status context salesMetrics summary createdAt updatedAt');
      
      return conversations;
    } catch (error) {
      logger.error('Error getting conversation history:', error);
      throw error;
    }
  }

  async updateCustomerContext(customerId, contextUpdates) {
    try {
      const { Customer } = getModels();
      const customer = await Customer.findOne({ customerId });
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }

      // Actualizar preferencias
      if (contextUpdates.preferences) {
        Object.assign(customer.preferences, contextUpdates.preferences);
      }

      // Actualizar perfil
      if (contextUpdates.profile) {
        Object.assign(customer.profile, contextUpdates.profile);
      }

      // Agregar tags
      if (contextUpdates.tags) {
        customer.tags = [...new Set([...customer.tags, ...contextUpdates.tags])];
      }

      // Agregar notas
      if (contextUpdates.note) {
        customer.notes.push({
          content: contextUpdates.note,
          author: contextUpdates.author || 'system'
        });
      }

      await customer.save();
      return customer;
    } catch (error) {
      logger.error('Error updating customer context:', error);
      throw error;
    }
  }
  transformMetadata(metadata) {
    if (!metadata) return metadata;
    
    // Transformar entidades de 'type' a 'entityType'
    if (metadata.entities && Array.isArray(metadata.entities)) {
      metadata.entities = metadata.entities.map(entity => {
        if (entity.type) {
          return {
            entityType: entity.type,
            value: entity.value,
            confidence: entity.confidence
          };
        }
        return entity;
      });
    }
    
    return metadata;
  }
}

module.exports = ConversationService;