// Setup global para tests
require('dotenv').config({ path: '.env.test' });

// Mock de servicios externos para tests
jest.mock('@anthropic-ai/sdk', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{ text: 'Respuesta de prueba del asistente' }],
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        })
      }
    }))
  };
});

// Mock de Redis para tests
jest.mock('../src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue({}),
  getRedisClient: jest.fn().mockReturnValue({
    setEx: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1)
  })
}));

// Mock de Bull Queue para tests
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({}),
    process: jest.fn(),
    on: jest.fn()
  }));
});

// Configuración global de timeout para tests
jest.setTimeout(30000);

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});