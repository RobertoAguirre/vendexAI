const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

class ClaudeService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.basePrompt = this.getBasePrompt();
    this.maxTokens = 4000;
    this.model = 'claude-3-5-sonnet-20241022';
  }

  getBasePrompt() {
    return `Eres un asistente de ventas experto, empático y profesional llamado Alex. Tu objetivo es ayudar a los clientes a encontrar productos que realmente necesiten, construyendo confianza y relaciones a largo plazo.

PERSONALIDAD:
- Empático y comprensivo: Detectas y respondes al tono emocional del cliente
- Profesional pero cercano: Mantienes un equilibrio entre formalidad y calidez
- Paciente y no presionas: Nunca fuerzas una venta, respetas el ritmo del cliente
- Intuitivo para detectar necesidades: Haces preguntas inteligentes para entender mejor
- Honesto sobre limitaciones: Si un producto no es ideal, lo mencionas

ESTRATEGIAS DE VENTA:
- Escucha activa: Analiza cuidadosamente lo que dice el cliente antes de responder
- Preguntas abiertas: Usa preguntas que inviten a compartir más información
- Beneficios sobre características: Enfócate en cómo el producto mejora la vida del cliente
- Manejo empático de objeciones: Reconoce las preocupaciones y ofrece soluciones
- Urgencia sutil: Crea motivación para actuar sin presionar agresivamente

SEGUIMIENTO:
- Memoria perfecta: Recuerdas todas las conversaciones previas con el cliente
- Personalización: Adaptas cada interacción basándote en el historial
- Timing inteligente: Sugieres momentos apropiados para recontactar
- Celebración de éxitos: Reconoces y celebras las compras exitosas

REGLAS IMPORTANTES:
1. NUNCA seas agresivo o insistente en las ventas
2. SIEMPRE prioriza las necesidades reales del cliente sobre las ventas
3. Si no tienes información sobre un producto, admítelo honestamente
4. Mantén un tono conversacional y natural, evita sonar robótico
5. Adapta tu estilo de comunicación al del cliente (formal/casual/técnico)
6. Si detectas frustración o molestia, cambia inmediatamente a modo de resolución de problemas
7. Cuando menciones productos, NUNCA incluyas URLs de imágenes en el texto de la respuesta
8. Usa las imágenes para hacer los productos más atractivos y reales
9. Si el cliente pregunta "cómo se ve" o "muéstrame", menciona que puedes ver la imagen pero NO incluyas la URL

DETECCIÓN DE INTENCIONES:
- Inquiry: Cliente busca información general
- Purchase_intent: Cliente muestra señales de querer comprar
- Objection: Cliente expresa dudas o preocupaciones
- Support: Cliente necesita ayuda técnica o post-venta
- Complaint: Cliente está insatisfecho con algo
- Compliment: Cliente expresa satisfacción o agradecimiento

ANÁLISIS DE SENTIMIENTO:
Evalúa constantemente el sentimiento del cliente:
- Very_positive: Muy entusiasmado, listo para comprar
- Positive: Interesado y receptivo
- Neutral: Explorando opciones, sin compromiso emocional
- Negative: Frustrado, dudoso o insatisfecho
- Very_negative: Muy molesto, considerando irse

Responde siempre en español y mantén un tono profesional pero cálido.`;
  }

  async generateResponse(messages, context = {}) {
    try {
      // Construir el contexto completo
      const systemPrompt = this.buildSystemPrompt(context);
      
      // Preparar mensajes para Claude
      const claudeMessages = this.prepareMessages(messages);
      
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: claudeMessages
      });

      const assistantMessage = response.content[0].text;
      
      // Analizar la respuesta para extraer metadatos
      const analysis = await this.analyzeResponse(assistantMessage, messages);
      
      return {
        content: assistantMessage,
        metadata: analysis,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
      
    } catch (error) {
      logger.error('Error en ClaudeService.generateResponse:', error);
      throw new Error('Error al generar respuesta del asistente');
    }
  }

  buildSystemPrompt(context) {
    let systemPrompt = this.basePrompt;
    
    // Agregar información del cliente si está disponible
    if (context.customer) {
      systemPrompt += `\n\nINFORMACIÓN DEL CLIENTE:
- Nombre: ${context.customer.name}
- Tipo: ${context.customer.profile?.customerType || 'nuevo'}
- Estilo de comunicación preferido: ${context.customer.preferences?.communicationStyle || 'casual'}
- Compras previas: ${context.customer.profile?.totalPurchases || 0}
- Valor de por vida: $${context.customer.profile?.lifetimeValue || 0}`;

      if (context.customer.preferences?.interests?.length > 0) {
        systemPrompt += `\n- Intereses: ${context.customer.preferences.interests.join(', ')}`;
      }
      
      if (context.customer.preferences?.painPoints?.length > 0) {
        systemPrompt += `\n- Puntos de dolor conocidos: ${context.customer.preferences.painPoints.join(', ')}`;
      }
    }
    
    // Agregar información de productos si está disponible
    if (context.products && context.products.length > 0) {
      systemPrompt += `\n\nPRODUCTOS DISPONIBLES:`;
      context.products.forEach(product => {
        systemPrompt += `\n- ${product.name}: ${product.aiOptimizedDescription}`;
        systemPrompt += `\n  Precio: $${product.pricing.basePrice}`;
        if (product.aiInsights?.bestSellingPoints?.length > 0) {
          systemPrompt += `\n  Puntos clave: ${product.aiInsights.bestSellingPoints.join(', ')}`;
        }
        // Agregar información de imágenes si están disponibles (solo para contexto interno)
        if (product.hasImages && product.primaryImage) {
          systemPrompt += `\n  Imagen disponible: [IMAGEN_DISPONIBLE]`;
          if (product.imageCount > 1) {
            systemPrompt += `\n  Total de imágenes: ${product.imageCount}`;
          }
        }
      });
    }
    
    // Agregar contexto de la conversación
    if (context.conversation) {
      systemPrompt += `\n\nCONTEXTO DE LA CONVERSACIÓN:
- Etapa actual: ${context.conversation.context?.stage || 'awareness'}
- Nivel de urgencia: ${context.conversation.context?.urgency || 'medium'}
- Puntuación de lead: ${context.conversation.salesMetrics?.leadScore || 50}/100
- Probabilidad de conversión: ${Math.round((context.conversation.salesMetrics?.conversionProbability || 0.5) * 100)}%`;

      if (context.conversation.context?.productsDiscussed?.length > 0) {
        systemPrompt += `\n- Productos discutidos: ${context.conversation.context.productsDiscussed.map(p => p.productId).join(', ')}`;
      }
      
      if (context.conversation.context?.customerNeeds?.length > 0) {
        systemPrompt += `\n- Necesidades identificadas: ${context.conversation.context.customerNeeds.join(', ')}`;
      }
    }
    
    return systemPrompt;
  }

  prepareMessages(messages) {
    return messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
  }

  async analyzeResponse(response, conversationHistory) {
    try {
      const analysisPrompt = `Analiza la siguiente respuesta del asistente de ventas y extrae los siguientes metadatos en formato JSON:

{
  "sentiment": "positive|negative|neutral|very_positive|very_negative",
  "intent": "inquiry|purchase_intent|objection|support|complaint|compliment",
  "confidence": 0.85,
  "entities": [
    {"type": "product", "value": "nombre_producto", "confidence": 0.9},
    {"type": "price", "value": "100", "confidence": 0.8}
  ],
  "salesSignals": {
    "buyingIntent": 0.7,
    "urgency": "low|medium|high",
    "objections": ["precio", "funcionalidad"],
    "interests": ["producto_x", "característica_y"]
  },
  "nextBestAction": "gather_information|nurture_lead|send_proposal|close_sale|schedule_followup"
}

Respuesta del asistente: "${response}"

Contexto de conversación reciente: ${JSON.stringify(conversationHistory.slice(-3))}

Responde SOLO con el JSON, sin explicaciones adicionales.`;

      const analysisResponse = await this.client.messages.create({
        model: 'claude-3-haiku-20240307', // Modelo más rápido para análisis
        max_tokens: 1000,
        messages: [{ role: 'user', content: analysisPrompt }]
      });

      const analysisText = analysisResponse.content[0].text;
      
      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        logger.warn('Error parsing analysis response, using defaults:', parseError);
        return this.getDefaultAnalysis();
      }
      
    } catch (error) {
      logger.error('Error analyzing response:', error);
      return this.getDefaultAnalysis();
    }
  }

  getDefaultAnalysis() {
    return {
      sentiment: 'neutral',
      intent: 'inquiry',
      confidence: 0.5,
      entities: [],
      salesSignals: {
        buyingIntent: 0.5,
        urgency: 'medium',
        objections: [],
        interests: []
      },
      nextBestAction: 'gather_information'
    };
  }

  async generateFollowUpMessage(context) {
    try {
      const prompt = `Genera un mensaje de seguimiento personalizado para un cliente basado en el siguiente contexto:

INFORMACIÓN DEL CLIENTE:
${JSON.stringify(context.customer, null, 2)}

ÚLTIMA CONVERSACIÓN:
${JSON.stringify(context.lastConversation, null, 2)}

TIPO DE SEGUIMIENTO: ${context.followUpType}
DÍAS DESDE ÚLTIMA INTERACCIÓN: ${context.daysSinceLastInteraction}

INSTRUCCIONES:
1. El mensaje debe ser natural y personalizado
2. Referencia específicamente la conversación previa
3. Proporciona valor (información útil, oferta especial, etc.)
4. Incluye una llamada a la acción sutil
5. Mantén un tono ${context.customer.preferences?.communicationStyle || 'profesional pero cercano'}
6. Máximo 200 palabras

Genera SOLO el mensaje, sin explicaciones adicionales.`;

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim();
      
    } catch (error) {
      logger.error('Error generating follow-up message:', error);
      throw new Error('Error al generar mensaje de seguimiento');
    }
  }

  async analyzeSentiment(text) {
    try {
      const prompt = `Analiza el sentimiento del siguiente texto y responde con un JSON:

{
  "sentiment": "very_negative|negative|neutral|positive|very_positive",
  "confidence": 0.85,
  "emotions": ["frustration", "excitement", "curiosity"],
  "urgency": "low|medium|high"
}

Texto a analizar: "${text}"

Responde SOLO con el JSON.`;

      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      return JSON.parse(response.content[0].text);
      
    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        emotions: [],
        urgency: 'medium'
      };
    }
  }
}

module.exports = ClaudeService;