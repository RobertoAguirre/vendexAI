# Vendex AI - Frontend

Frontend minimalista y super lean para el asistente de ventas inteligente Vendex AI, desarrollado con SvelteKit.

## 🚀 Características

- **Chat Inteligente**: Interfaz de chat con asistente de ventas AI
- **Métricas en Tiempo Real**: Visualización de lead score, conversión y sentimiento
- **Dashboard**: Panel de métricas y análisis de ventas
- **Catálogo de Productos**: Visualización de productos disponibles
- **Panel de Admin**: Entrenamiento del asistente con conversaciones
- **Diseño Responsive**: Optimizado para móviles y desktop
- **UI Minimalista**: Diseño limpio y moderno con Tailwind CSS

## 📱 Páginas Disponibles

- **`/`** - Chat principal con el asistente de ventas
- **`/products`** - Catálogo de productos con filtros por categoría
- **`/dashboard`** - Panel de métricas y análisis
- **`/admin`** - Panel de entrenamiento del asistente

## 🛠️ Tecnologías

- **SvelteKit 2.0** - Framework de frontend
- **Tailwind CSS 4.0** - Framework de estilos
- **Vite** - Build tool y dev server
- **JavaScript ES6+** - Lógica de la aplicación

## 🚀 Instalación y Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build

# Preview de producción
npm run preview
```

## 🔧 Configuración

El frontend se conecta automáticamente al backend:
- **Desarrollo**: `http://localhost:3000`
- **Producción**: URL actual (vendexai.onrender.com)

## 📱 Características Mobile-First

- Navegación móvil con menú hamburguesa
- Diseño responsive optimizado
- Interfaz táctil amigable
- Optimización para pantallas pequeñas

## 🎨 Componentes Principales

- **`MobileNav.svelte`** - Navegación móvil
- **`MetricsDisplay.svelte`** - Visualización de métricas
- **Chat Interface** - Interfaz principal de conversación
- **Product Catalog** - Catálogo de productos
- **Dashboard** - Panel de métricas

## 🔗 Integración con Backend

El frontend se integra con las siguientes APIs del backend:
- `POST /api/chat/message` - Envío de mensajes
- `GET /api/analytics/dashboard` - Métricas del dashboard
- `GET /api/products` - Lista de productos

## 📊 Métricas en Tiempo Real

- **Lead Score**: Puntuación del prospecto (0-100)
- **Conversión**: Probabilidad de conversión (%)
- **Sentimiento**: Análisis de sentimiento del cliente

## 🎯 Ejemplos de Uso

El chat incluye botones de ejemplo para probar:
- 💻 Buscar laptop
- 💰 Preguntar precio
- 🤔 Objeción precio
- ⚙️ Info técnica
- 🛡️ Garantía

## 📦 Estructura del Proyecto

```
frontend/
├── src/
│   ├── lib/
│   │   └── components/
│   │       ├── MobileNav.svelte
│   │       └── MetricsDisplay.svelte
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   ├── admin/+page.svelte
│   │   ├── dashboard/+page.svelte
│   │   └── products/+page.svelte
│   ├── app.css
│   └── app.html
├── static/
├── package.json
└── vite.config.js
```

## 🚀 Despliegue

El frontend está configurado para desplegarse en:
- **Render** - Automático desde el repositorio
- **Vercel** - Compatible con SvelteKit
- **Netlify** - Compatible con SvelteKit

## 📝 Licencia

MIT License - Ver archivo LICENSE para más detalles.
