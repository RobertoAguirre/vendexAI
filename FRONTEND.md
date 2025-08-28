# 🎨 Frontend Simple - Vendex AI

## 📱 Páginas Disponibles

### 1. Chat Principal (`/`)
- **URL**: `http://localhost:3000/`
- **Funcionalidad**: Interfaz de chat con el asistente de ventas
- **Características**:
  - Chat en tiempo real con el asistente
  - Métricas visuales (Lead Score, Probabilidad de conversión)
  - Ejemplos predefinidos para probar
  - Detección de sentimientos
  - ID de cliente personalizable

### 2. Dashboard (`/dashboard.html`)
- **URL**: `http://localhost:3000/dashboard.html`
- **Funcionalidad**: Métricas y analytics en tiempo real
- **Características**:
  - Estadísticas de conversaciones
  - Top prospects con alta probabilidad
  - Alertas automáticas
  - Auto-refresh cada 30 segundos

### 3. Catálogo de Productos (`/products.html`)
- **URL**: `http://localhost:3000/products.html`
- **Funcionalidad**: Explorar productos disponibles
- **Características**:
  - Búsqueda de productos
  - Información detallada de precios
  - Características destacadas
  - Botón directo para preguntar al asistente

## 🚀 Inicio Rápido

### 1. Setup Completo
```bash
# Setup automático
npm run demo

# Configurar API key en .env
# ANTHROPIC_API_KEY=tu_key_aqui

# Iniciar servicios
mongod & redis-server &

# Inicializar datos
npm run seed

# Iniciar servidor
npm run dev
```

### 2. Abrir en el Navegador
```
http://localhost:3000/          # Chat principal
http://localhost:3000/dashboard.html  # Dashboard
http://localhost:3000/products.html   # Productos
```

## 💬 Casos de Uso para Probar

### Conversaciones de Ejemplo

#### 1. Cliente Nuevo Interesado
```
ID: cliente_001
Mensaje: "Hola, estoy buscando una laptop para trabajo de diseño gráfico"
```

#### 2. Cliente con Presupuesto Específico
```
ID: cliente_002  
Mensaje: "Necesito una laptop, mi presupuesto es de $1500"
```

#### 3. Cliente con Objeciones
```
ID: cliente_003
Mensaje: "La Laptop Pro 15 me parece muy cara, ¿hay descuentos?"
```

#### 4. Cliente Técnico
```
ID: cliente_004
Mensaje: "¿Qué especificaciones técnicas tiene el procesador de la laptop?"
```

#### 5. Cliente Indeciso
```
ID: cliente_005
Mensaje: "No estoy seguro si necesito tanta potencia, ¿qué me recomiendas?"
```

### Flujo Completo de Prueba

1. **Iniciar Conversación**
   - Ve a `http://localhost:3000/`
   - Usa ID: `cliente_demo`
   - Mensaje: "Hola, necesito ayuda para elegir una laptop"

2. **Observar Métricas**
   - Lead Score se actualiza automáticamente
   - Probabilidad de conversión cambia según la conversación
   - Sentimiento del cliente se detecta en tiempo real

3. **Continuar Conversación**
   - "¿Cuál es el precio de la Laptop Pro 15?"
   - "Me interesa pero me parece cara"
   - "¿Qué garantía incluye?"

4. **Ver Dashboard**
   - Ve a `http://localhost:3000/dashboard.html`
   - Observa las métricas actualizadas
   - Ve el cliente en "Top Prospects" si tiene alta probabilidad

5. **Explorar Productos**
   - Ve a `http://localhost:3000/products.html`
   - Busca "laptop"
   - Click en "Preguntar al Asistente" para abrir chat con contexto

## 🎯 Características del Asistente

### Personalidad Inteligente
- **Empático**: Detecta si estás frustrado, emocionado, etc.
- **Adaptativo**: Cambia su estilo según tu forma de comunicarte
- **No agresivo**: Nunca presiona para vender
- **Informativo**: Proporciona detalles técnicos cuando los necesitas

### Capacidades de Venta
- **Recomendaciones personalizadas** basadas en tus necesidades
- **Manejo de objeciones** inteligente y empático
- **Cálculo automático** de descuentos y ofertas
- **Seguimientos programados** automáticamente

### Métricas en Tiempo Real
- **Lead Score (0-100)**: Qué tan probable es que compres
- **Probabilidad de Conversión**: Porcentaje de probabilidad
- **Análisis de Sentimiento**: Tu estado emocional actual
- **Etapa de Venta**: En qué parte del proceso estás

## 🔧 Personalización

### Cambiar Personalidad del Asistente
Edita `src/services/ClaudeService.js` línea ~15:
```javascript
// Cambiar de empático a más técnico, formal, etc.
```

### Agregar Nuevos Productos
Edita `examples/sample-products.json` y ejecuta:
```bash
npm run seed
```

### Modificar Interfaz
Los archivos están en `/public/`:
- `index.html` - Chat principal
- `dashboard.html` - Dashboard
- `products.html` - Catálogo

## 📊 Métricas que Puedes Observar

### En el Chat
- **Lead Score**: Se actualiza con cada mensaje
- **Probabilidad**: Cambia según el interés mostrado
- **Sentimiento**: Detecta si estás contento, frustrado, etc.

### En el Dashboard
- **Conversaciones del día**
- **Score promedio de leads**
- **Conversaciones activas**
- **Seguimientos pendientes**
- **Top prospects** con alta probabilidad

## 🧪 Experimentos para Probar

### 1. Diferentes Estilos de Comunicación
- Formal: "Estimado asistente, requiero información..."
- Casual: "Hola! Qué tal, necesito una laptop"
- Técnico: "Necesito especificaciones del procesador Intel i7"

### 2. Diferentes Niveles de Interés
- Alto: "Quiero comprar ahora, ¿cuál es el precio final?"
- Medio: "Me interesa pero necesito pensarlo"
- Bajo: "Solo estoy viendo opciones"

### 3. Manejo de Objeciones
- Precio: "Está muy caro"
- Funcionalidad: "No necesito tanta potencia"
- Competencia: "En otro lugar está más barato"

## 🚨 Troubleshooting

### El chat no responde
```bash
# Verificar que el servidor esté corriendo
npm run check

# Verificar en la consola del navegador (F12)
```

### Dashboard no carga datos
```bash
# El dashboard necesita autenticación
# Se autentica automáticamente con credenciales de demo
```

### Productos no aparecen
```bash
# Ejecutar el seeder
npm run seed
```

## 🎉 ¡Listo para Probar!

Tu asistente de ventas inteligente está completamente funcional. Puedes:

1. **Chatear** con el asistente y ver cómo adapta su personalidad
2. **Observar métricas** en tiempo real mientras conversas
3. **Explorar productos** y hacer preguntas específicas
4. **Ver analytics** de todas las conversaciones

¡Disfruta probando tu asistente de ventas con IA! 🤖✨