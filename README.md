# Vendex AI - Asistente de Ventas Inteligente

Un backend completo en Node.js que integra con la API de Claude (Anthropic) para crear un asistente de ventas inteligente, empático y efectivo.

## 🚀 Características Principales

### Asistente de Ventas IA
- **Personalidad empática**: Detecta el tono emocional y adapta las respuestas
- **Conversación natural**: Evita ser robótico o agresivo en las ventas
- **Análisis de sentimientos**: Evalúa el estado emocional del cliente en tiempo real
- **Detección de intenciones**: Identifica señales de compra, objeciones y necesidades
- **Seguimiento inteligente**: Programa seguimientos automáticos personalizados

### Gestión de Conversaciones
- **Contexto persistente**: Mantiene el historial completo de cada cliente
- **Puntuación de leads**: Calcula automáticamente la probabilidad de conversión
- **Etapas de venta**: Rastrea el progreso del cliente en el embudo de ventas
- **Métricas en tiempo real**: Analiza el rendimiento de cada conversación

### Sistema de Seguimientos
- **Automatización inteligente**: Programa seguimientos basados en comportamiento
- **Múltiples canales**: Email, SMS, WhatsApp, notificaciones in-app
- **Personalización avanzada**: Mensajes generados por IA para cada cliente
- **Métricas de efectividad**: Rastrea tasas de respuesta y conversión

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + Express
- **Base de datos**: MongoDB + Redis
- **IA**: Claude API (Anthropic)
- **Colas**: Bull Queue para trabajos programados
- **WebSockets**: Socket.io para tiempo real
- **Autenticación**: JWT
- **Logging**: Winston
- **Validación**: Joi

## 🚀 Inicio Rápido

### Variables de Entorno
```bash
# 1. Copia el archivo de ejemplo
cp .env.example .env

# 2. Edita .env y completa las variables:
# - ANTHROPIC_API_KEY (REQUERIDO)
# - MONGODB_URI 
# - JWT_SECRET
```

⚠️ **IMPORTANTE**: Nunca subas el archivo `.env` a Git

### Desarrollo Local
```bash
# Setup completo automático
npm run setup

# Iniciar servicios (MongoDB + Redis)
# Luego ejecutar:
npm run local
```

**📖 Guía detallada**: Ver [QUICKSTART.md](QUICKSTART.md)

### Deploy en Render
```bash
# 1. Push a GitHub
git push origin main

# 2. Conectar en render.com
# 3. Configurar ANTHROPIC_API_KEY
# 4. Deploy automático
```

**📖 Guía completa**: Ver [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔧 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrar usuario
- `GET /api/auth/me` - Obtener usuario actual

### Chat y Conversaciones
- `POST /api/chat/message` - Enviar mensaje al asistente
- `GET /api/chat/history/:customerId` - Historial de conversaciones
- `POST /api/chat/context` - Actualizar contexto del cliente
- `GET /api/chat/conversation/:conversationId` - Detalles de conversación

### Seguimientos
- `POST /api/followup/schedule` - Programar seguimiento
- `GET /api/followup/pending` - Seguimientos pendientes
- `POST /api/followup/response` - Registrar respuesta
- `GET /api/followup/metrics` - Métricas de seguimientos

### Productos
- `POST /api/products/sync` - Sincronizar catálogo
- `GET /api/products/search` - Buscar productos
- `GET /api/products/:productId` - Detalles de producto

### Analytics
- `GET /api/analytics/sales` - Métricas de ventas
- `GET /api/analytics/customers` - Métricas de clientes
- `GET /api/analytics/dashboard` - Dashboard principal

## 💬 Uso del Asistente

### Enviar mensaje al asistente
```javascript
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'customer_123',
    message: 'Hola, estoy buscando un producto para mi oficina',
    channel: 'web'
  })
});

const data = await response.json();
console.log(data.data.message); // Respuesta del asistente
```

### Programar seguimiento
```javascript
const followUp = await fetch('/api/followup/schedule', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    customerId: 'customer_123',
    type: 'post_interaction',
    delayHours: 24,
    context: {
      triggerEvent: 'conversation_end',
      reason: 'Cliente mostró interés pero no compró'
    }
  })
});
```

## 🧠 Personalidad del Asistente

El asistente está configurado con una personalidad específica:

- **Empático**: Detecta y responde al estado emocional
- **Profesional pero cercano**: Equilibra formalidad y calidez
- **No agresivo**: Nunca presiona para vender
- **Intuitivo**: Hace preguntas inteligentes para entender necesidades
- **Honesto**: Admite limitaciones de productos cuando es necesario

## 📊 Métricas y Analytics

### Métricas de Conversación
- Lead Score (0-100)
- Probabilidad de conversión
- Etapa en el embudo de ventas
- Análisis de sentimientos
- Tiempo de respuesta

### Métricas de Cliente
- Tipo de cliente (nuevo, recurrente, VIP)
- Valor de por vida
- Nivel de engagement
- Historial de interacciones

### Métricas de Seguimiento
- Tasa de respuesta
- Tasa de conversión
- ROI por tipo de seguimiento
- Efectividad por canal

## 🔄 Sistema de Seguimientos

### Tipos de Seguimiento
- `post_interaction` - Después de una conversación
- `abandoned_cart` - Carrito abandonado
- `post_purchase` - Post-venta
- `nurture` - Nutrición de leads
- `reactivation` - Reactivación de clientes
- `upsell` - Venta adicional

### Canales Disponibles
- Email
- SMS
- WhatsApp
- Notificaciones in-app
- Llamadas (programadas)

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests en modo watch
npm run test:watch
```

## 📝 Logging

Los logs se almacenan en:
- `logs/error.log` - Solo errores
- `logs/combined.log` - Todos los logs

Niveles de log configurables:
- `error`
- `warn`
- `info`
- `debug`

## 🧪 Probar el Asistente

```bash
# Localmente
npm run test-api

# En producción (Render)
npm run test-prod
```

### Ejemplo de Conversación
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cliente_001",
    "message": "Hola, busco una laptop para diseño",
    "channel": "web"
  }'
```

**Respuesta del asistente:**
- Mensaje personalizado y empático
- Lead Score automático (0-100)
- Probabilidad de conversión
- Seguimientos programados automáticamente

## 🔒 Seguridad

- Rate limiting configurado
- Validación de entrada con Joi
- Autenticación JWT
- Encriptación de datos sensibles
- Logs de seguridad

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver archivo `LICENSE` para detalles.

## 🆘 Soporte

Para soporte técnico:
- Crear issue en GitHub
- Email: soporte@vendex.com
- Documentación: [docs.vendex.com](https://docs.vendex.com)

## 🔮 Roadmap

- [ ] Integración con CRM (Salesforce, HubSpot)
- [ ] Análisis de voz en tiempo real
- [ ] Dashboard web completo
- [ ] Integración con WhatsApp Business
- [ ] Análisis predictivo avanzado
- [ ] Soporte multiidioma
- [ ] API de webhooks
- [ ] Integración con sistemas de pago