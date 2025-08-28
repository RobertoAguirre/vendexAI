# API Documentation - Vendex AI Sales Assistant

## Autenticación

Todas las rutas protegidas requieren un token JWT en el header:
```
Authorization: Bearer <token>
```

## Endpoints

### Autenticación

#### POST /api/auth/login
Autenticar usuario y obtener token JWT.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_aqui",
    "user": {
      "id": "user_id",
      "name": "Nombre Usuario",
      "email": "usuario@ejemplo.com",
      "role": "agent"
    }
  }
}
```

#### POST /api/auth/register
Registrar nuevo usuario.

**Request:**
```json
{
  "name": "Nuevo Usuario",
  "email": "nuevo@ejemplo.com",
  "password": "contraseña123",
  "role": "agent"
}
```

### Chat y Conversaciones

#### POST /api/chat/message
Enviar mensaje al asistente de ventas.

**Request:**
```json
{
  "customerId": "customer_123",
  "message": "Hola, estoy buscando una laptop",
  "channel": "web"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_456",
    "message": "¡Hola! Me da mucho gusto ayudarte a encontrar la laptop perfecta...",
    "metadata": {
      "leadScore": 65,
      "conversionProbability": 0.7,
      "customerSentiment": "positive",
      "intent": "inquiry",
      "sentiment": "positive"
    }
  },
  "usage": {
    "inputTokens": 150,
    "outputTokens": 200
  }
}
```

#### GET /api/chat/history/:customerId
Obtener historial de conversaciones de un cliente.

**Response:**
```json
{
  "success": true,
  "data": {
    "customerId": "customer_123",
    "conversations": [
      {
        "conversationId": "conv_456",
        "status": "active",
        "context": {
          "stage": "interest",
          "urgency": "medium"
        },
        "salesMetrics": {
          "leadScore": 65,
          "conversionProbability": 0.7
        },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 1
  }
}
```

#### POST /api/chat/context
Actualizar contexto del cliente.

**Request:**
```json
{
  "customerId": "customer_123",
  "preferences": {
    "communicationStyle": "formal",
    "budgetRange": {
      "min": 1000,
      "max": 2000
    }
  },
  "tags": ["cliente_premium"],
  "note": "Cliente interesado en productos de alta gama"
}
```

### Seguimientos

#### POST /api/followup/schedule
Programar un seguimiento automático.

**Request:**
```json
{
  "customerId": "customer_123",
  "type": "post_interaction",
  "delayHours": 24,
  "priority": "medium",
  "context": {
    "triggerEvent": "conversation_end",
    "reason": "Cliente mostró interés pero no compró"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "followUpId": "followup_789",
    "customerId": "customer_123",
    "type": "post_interaction",
    "scheduledFor": "2024-01-16T10:30:00Z",
    "priority": "medium",
    "status": "pending"
  }
}
```

#### GET /api/followup/pending
Obtener seguimientos pendientes.

**Query Parameters:**
- `limit` (opcional): Número máximo de resultados (default: 50)
- `priority` (opcional): Filtrar por prioridad
- `type` (opcional): Filtrar por tipo de seguimiento

#### POST /api/followup/response
Registrar respuesta a un seguimiento.

**Request:**
```json
{
  "followUpId": "followup_789",
  "responseContent": "Gracias por contactarme, me interesa la oferta",
  "sentiment": "positive",
  "conversionValue": 1299.99
}
```

### Productos

#### POST /api/products/sync
Sincronizar catálogo de productos.

**Request:**
```json
{
  "products": [
    {
      "productId": "laptop-pro-15",
      "name": "Laptop Pro 15\"",
      "description": "Laptop profesional...",
      "aiOptimizedDescription": "Esta laptop es perfecta para...",
      "category": "Tecnología",
      "pricing": {
        "basePrice": 1299.99,
        "currency": "USD"
      }
    }
  ]
}
```

#### GET /api/products/search
Buscar productos.

**Query Parameters:**
- `q`: Término de búsqueda (requerido)
- `category` (opcional): Filtrar por categoría
- `minPrice` (opcional): Precio mínimo
- `maxPrice` (opcional): Precio máximo
- `limit` (opcional): Número de resultados (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "laptop",
    "products": [
      {
        "productId": "laptop-pro-15",
        "name": "Laptop Pro 15\"",
        "description": "Laptop profesional...",
        "pricing": {
          "originalPrice": 1299.99,
          "finalPrice": 1169.99,
          "savings": 130
        }
      }
    ],
    "total": 1
  }
}
```

### Analytics

#### GET /api/analytics/sales
Obtener métricas de ventas del asistente.

**Query Parameters:**
- `startDate` (opcional): Fecha de inicio (ISO string)
- `endDate` (opcional): Fecha de fin (ISO string)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    "overview": {
      "totalConversations": 150,
      "avgLeadScore": 68.5,
      "conversionRate": "12.67",
      "totalEstimatedValue": 45000
    },
    "byStage": [
      {
        "_id": "interest",
        "count": 45,
        "avgLeadScore": 72
      }
    ],
    "trends": [
      {
        "_id": { "year": 2024, "month": 1, "day": 15 },
        "conversations": 8,
        "avgLeadScore": 65
      }
    ]
  }
}
```

#### GET /api/analytics/dashboard
Obtener datos para dashboard principal.

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "todayConversations": 12,
      "conversationChange": 3,
      "avgLeadScore": 68,
      "activeConversations": 25,
      "pendingFollowUps": 8
    },
    "topProspects": [
      {
        "customerId": "customer_123",
        "name": "Ana García",
        "conversionProbability": 0.9
      }
    ],
    "alerts": {
      "overdueFollowUps": 3,
      "inactiveVipCustomers": 2,
      "total": 5
    }
  }
}
```

## Códigos de Estado HTTP

- `200` - Éxito
- `201` - Creado exitosamente
- `400` - Datos de entrada inválidos
- `401` - No autorizado (token inválido o faltante)
- `403` - Prohibido (permisos insuficientes)
- `404` - Recurso no encontrado
- `429` - Demasiadas solicitudes (rate limit)
- `500` - Error interno del servidor

## Rate Limiting

- Límite por defecto: 100 solicitudes por 15 minutos por IP
- Headers de respuesta incluyen información del límite:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

## WebSocket Events

### Conexión
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'jwt_token_aqui'
  },
  query: {
    customerId: 'customer_123'
  }
});
```

### Eventos del Cliente
- `join_conversation` - Unirse a una conversación
- `typing_start` - Iniciar indicador de escritura
- `typing_stop` - Detener indicador de escritura
- `message_read` - Marcar mensaje como leído

### Eventos del Servidor
- `new_message` - Nuevo mensaje en conversación
- `lead_score_update` - Actualización de puntuación de lead
- `followup_scheduled` - Seguimiento programado
- `typing_start` / `typing_stop` - Indicadores de escritura
- `user_disconnected` - Usuario desconectado

## Ejemplos de Uso

### Flujo completo de conversación
```javascript
// 1. Enviar mensaje inicial
const response1 = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer_123',
    message: 'Hola, necesito una laptop para diseño gráfico'
  })
});

// 2. Continuar conversación
const response2 = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    customerId: 'customer_123',
    message: 'Mi presupuesto es de $1500'
  })
});

// 3. Programar seguimiento si no compra
if (response2.data.metadata.leadScore > 60) {
  await fetch('/api/followup/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      customerId: 'customer_123',
      type: 'nurture',
      delayHours: 48
    })
  });
}
```