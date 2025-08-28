# 🚀 Quick Start - Vendex AI Sales Assistant

## ⚡ Inicio Rápido (5 minutos)

### 1. Prerequisitos
Asegúrate de tener instalado:
- Node.js (v16 o superior)
- MongoDB
- Redis

### 2. Setup Automático
```bash
# Clonar repositorio
git clone <tu-repo-url>
cd vendex-ai-sales-assistant

# Setup completo automático
npm run setup
```

### 3. Configurar API Key
Edita el archivo `.env` y agrega tu API key de Claude:
```env
ANTHROPIC_API_KEY=sk-ant-api03-tu-api-key-aqui
```

### 4. Iniciar Servicios
```bash
# Terminal 1: MongoDB
mongod

# Terminal 2: Redis  
redis-server

# Terminal 3: Aplicación
npm run local
```

### 5. Probar el Asistente
```bash
# En otra terminal
npm run test-api
```

¡Listo! Tu asistente de ventas está funcionando en `http://localhost:3000`

## 🧪 Prueba Rápida del Asistente

### Conversación de Ejemplo
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cliente_001", 
    "message": "Hola, necesito una laptop para diseño gráfico",
    "channel": "web"
  }'
```

### Respuesta Esperada
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_123",
    "message": "¡Hola! Me da mucho gusto ayudarte a encontrar la laptop perfecta para diseño gráfico...",
    "metadata": {
      "leadScore": 65,
      "conversionProbability": 0.7,
      "customerSentiment": "positive"
    }
  }
}
```

## 🎯 Casos de Uso para Probar

### 1. Cliente Interesado
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cliente_001", "message": "Me interesa la Laptop Pro 15, ¿cuál es el precio?"}'
```

### 2. Cliente con Objeciones
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cliente_002", "message": "Me parece muy cara esa laptop"}'
```

### 3. Cliente Técnico
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customerId": "cliente_003", "message": "¿Qué especificaciones técnicas tiene el procesador?"}'
```

## 📊 Dashboard y Analytics

### Obtener Token de Autenticación
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@vendex.com", "password": "password"}'
```

### Ver Dashboard
```bash
curl -X GET http://localhost:3000/api/analytics/dashboard \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🔄 Seguimientos Automáticos

El asistente programa seguimientos automáticamente cuando:
- Un cliente muestra interés pero no compra (Lead Score > 60)
- Se detecta abandono de conversación en etapa avanzada
- Cliente VIP no ha interactuado recientemente

### Ver Seguimientos Pendientes
```bash
curl -X GET http://localhost:3000/api/followup/pending \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🛠️ Troubleshooting

### Error: "Cannot connect to MongoDB"
```bash
# Verificar que MongoDB esté ejecutándose
mongod --version
mongod
```

### Error: "Redis connection failed"
```bash
# Verificar que Redis esté ejecutándose
redis-cli ping
# Debería responder: PONG
```

### Error: "ANTHROPIC_API_KEY not found"
```bash
# Verificar archivo .env
cat .env | grep ANTHROPIC_API_KEY
```

### Verificar Servicios
```bash
npm run check
```

## 🚀 Deploy en Render

### 1. Push a GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Conectar en Render
1. Ve a [render.com](https://render.com)
2. Conecta tu repositorio
3. Render detectará automáticamente la configuración

### 3. Configurar Variables
En Render, agrega:
```env
ANTHROPIC_API_KEY=tu_api_key_aqui
JWT_SECRET=clave_secreta_segura
```

### 4. Probar en Producción
```bash
npm run test-prod
```

## 📱 Próximos Pasos

1. **Integrar con tu Frontend**: Usa los endpoints de la API
2. **Personalizar Productos**: Actualiza `examples/sample-products.json`
3. **Configurar Webhooks**: Para integraciones externas
4. **Monitorear Métricas**: Dashboard de analytics incluido

## 💡 Tips de Desarrollo

- Usa `npm run dev` para desarrollo con auto-reload
- Los logs se guardan en `/logs`
- Modifica prompts en `src/services/ClaudeService.js`
- Personaliza seguimientos en `src/services/FollowUpService.js`

¡Tu asistente de ventas inteligente está listo para ayudar a tus clientes! 🎉