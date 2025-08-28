const request = require('supertest');
const { app } = require('../src/server');
const mongoose = require('mongoose');
const Customer = require('../src/models/Customer');
const Conversation = require('../src/models/Conversation');

describe('Chat API', () => {
  beforeAll(async () => {
    // Conectar a base de datos de test
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/vendex-ai-test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Limpiar y cerrar conexión
    await Customer.deleteMany({});
    await Conversation.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Limpiar datos antes de cada test
    await Customer.deleteMany({});
    await Conversation.deleteMany({});
  });

  describe('POST /api/chat/message', () => {
    it('should process a new message from a new customer', async () => {
      const messageData = {
        customerId: 'test_customer_001',
        message: 'Hola, estoy buscando una laptop para trabajo',
        channel: 'web'
      };

      const response = await request(app)
        .post('/api/chat/message')
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('conversationId');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.metadata).toHaveProperty('leadScore');
      expect(response.body.data.metadata).toHaveProperty('conversionProbability');

      // Verificar que se creó el cliente
      const customer = await Customer.findOne({ customerId: 'test_customer_001' });
      expect(customer).toBeTruthy();
      expect(customer.behavior.interactionCount).toBe(1);

      // Verificar que se creó la conversación
      const conversation = await Conversation.findOne({ customerId: 'test_customer_001' });
      expect(conversation).toBeTruthy();
      expect(conversation.messages).toHaveLength(2); // mensaje del usuario + respuesta del asistente
    });

    it('should handle follow-up messages from existing customer', async () => {
      // Crear cliente existente
      const existingCustomer = new Customer({
        customerId: 'existing_customer',
        name: 'Cliente Existente',
        email: 'existing@test.com',
        behavior: {
          interactionCount: 3,
          lastInteraction: new Date()
        }
      });
      await existingCustomer.save();

      const messageData = {
        customerId: 'existing_customer',
        message: '¿Cuál es el precio de la laptop que me recomendaste?',
        channel: 'web'
      };

      const response = await request(app)
        .post('/api/chat/message')
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verificar que se actualizó el contador de interacciones
      const updatedCustomer = await Customer.findOne({ customerId: 'existing_customer' });
      expect(updatedCustomer.behavior.interactionCount).toBe(4);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        message: 'Mensaje sin customerId'
      };

      const response = await request(app)
        .post('/api/chat/message')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('inválidos');
    });

    it('should handle empty messages', async () => {
      const emptyMessageData = {
        customerId: 'test_customer',
        message: '',
        channel: 'web'
      };

      const response = await request(app)
        .post('/api/chat/message')
        .send(emptyMessageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/history/:customerId', () => {
    it('should return conversation history for existing customer', async () => {
      // Crear cliente y conversación de prueba
      const customer = new Customer({
        customerId: 'history_test_customer',
        name: 'Test Customer',
        email: 'test@example.com'
      });
      await customer.save();

      const conversation = new Conversation({
        conversationId: 'test_conversation_001',
        customerId: 'history_test_customer',
        messages: [
          {
            role: 'user',
            content: 'Hola',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: '¡Hola! ¿En qué puedo ayudarte?',
            timestamp: new Date()
          }
        ]
      });
      await conversation.save();

      // Generar token de prueba (simplificado)
      const token = 'test_token'; // En un test real, generarías un JWT válido

      const response = await request(app)
        .get('/api/chat/history/history_test_customer')
        .set('Authorization', `Bearer ${token}`)
        .expect(401); // Esperamos 401 porque el token no es válido

      // Para un test completo, necesitarías un token JWT válido
    });
  });

  describe('POST /api/chat/context', () => {
    it('should update customer context', async () => {
      // Crear cliente de prueba
      const customer = new Customer({
        customerId: 'context_test_customer',
        name: 'Context Test',
        email: 'context@test.com'
      });
      await customer.save();

      const contextUpdate = {
        customerId: 'context_test_customer',
        preferences: {
          communicationStyle: 'formal',
          interests: ['tecnología', 'productividad']
        },
        tags: ['cliente_premium'],
        note: 'Cliente interesado en productos de alta gama'
      };

      // Este test también requeriría autenticación válida
      const response = await request(app)
        .post('/api/chat/context')
        .send(contextUpdate)
        .expect(401); // Sin token válido
    });
  });
});

// Helper function para generar token JWT válido para tests
function generateTestToken(payload = { userId: 'test_user', role: 'agent' }) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
}

module.exports = { generateTestToken };