# Deployment en Render - Vendex AI

## 🚀 Guía Paso a Paso

### 1. Preparar el Repositorio

Asegúrate de que tu código esté en GitHub con todos los archivos necesarios:
- `package.json` con scripts de build
- `render.yaml` para configuración automática
- Código fuente en `/src`

### 2. Crear Cuenta en Render

1. Ve a [render.com](https://render.com)
2. Regístrate con tu cuenta de GitHub
3. Autoriza el acceso a tus repositorios

### 3. Crear el Web Service

1. **Nuevo Web Service**
   - Click en "New +" → "Web Service"
   - Conecta tu repositorio de GitHub
   - Selecciona el repositorio `vendex-ai-sales-assistant`

2. **Configuración Básica**
   ```
   Name: vendex-ai-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Variables de Entorno Requeridas**
   ```env
   NODE_ENV=production
   ANTHROPIC_API_KEY=tu_api_key_de_claude_aqui
   JWT_SECRET=clave_super_secreta_para_jwt
   JWT_EXPIRES_IN=7d
   LOG_LEVEL=info
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=1000
   ```

### 4. Configurar Base de Datos

#### MongoDB (Automático con render.yaml)
Render creará automáticamente una instancia de MongoDB y configurará `MONGODB_URI`

#### Redis (Automático con render.yaml)
Render creará automáticamente una instancia de Redis y configurará `REDIS_URL`

### 5. Deploy

1. Click en "Create Web Service"
2. Render automáticamente:
   - Clonará tu repositorio
   - Instalará dependencias
   - Configurará bases de datos
   - Desplegará la aplicación

### 6. Verificar Deployment

Una vez desplegado, tu API estará disponible en:
```
https://vendex-ai-backend.onrender.com
```

#### Endpoints de Prueba
```bash
# Health check
curl https://vendex-ai-backend.onrender.com/health

# Autenticación (usar credenciales por defecto)
curl -X POST https://vendex-ai-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendex.com","password":"password"}'

# Mensaje al asistente
curl -X POST https://vendex-ai-backend.onrender.com/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"customerId":"test_001","message":"Hola, necesito ayuda"}'
```

## 🔧 Configuración Avanzada

### Variables de Entorno Opcionales
```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Cliente URL (para CORS)
CLIENT_URL=https://tu-frontend.onrender.com

# Logging
LOG_LEVEL=info
```

### Configuración de CORS
Si tienes un frontend, agrega la URL en las variables de entorno:
```env
CLIENT_URL=https://tu-frontend-app.onrender.com
```

## 📊 Monitoreo

### Logs en Render
- Ve a tu servicio en Render Dashboard
- Click en "Logs" para ver logs en tiempo real
- Los errores aparecerán automáticamente

### Métricas
- CPU y memoria se muestran en el dashboard
- Render incluye métricas básicas gratis

## 🔄 Actualizaciones

### Deploy Automático
Cada push a la rama `main` desplegará automáticamente

### Deploy Manual
En el dashboard de Render:
1. Ve a tu servicio
2. Click en "Manual Deploy"
3. Selecciona la rama a desplegar

## 🐛 Troubleshooting

### Error: "Build failed"
```bash
# Verificar que package.json tenga:
"scripts": {
  "start": "node src/server.js",
  "build": "echo 'Build completed'"
}
```

### Error: "Cannot connect to database"
- Verificar que `render.yaml` esté en la raíz del proyecto
- Las bases de datos se crean automáticamente con el archivo

### Error: "ANTHROPIC_API_KEY not found"
- Verificar que la variable esté configurada en Render
- No incluir comillas en el valor

### Error: "Port already in use"
```javascript
// En src/server.js, usar:
const PORT = process.env.PORT || 3000;
```

## 💡 Tips de Optimización

### 1. Usar Plan Gratuito Eficientemente
- El plan gratuito "duerme" después de 15 min de inactividad
- Primera request después del "sueño" toma ~30 segundos

### 2. Optimizar Tiempo de Arranque
```javascript
// Lazy loading de servicios pesados
const initializeServices = async () => {
  // Solo inicializar cuando sea necesario
};
```

### 3. Configurar Health Checks
```javascript
// Ya incluido en src/server.js
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});
```

## 🔐 Seguridad en Producción

### Variables Sensibles
- Nunca commitear API keys
- Usar variables de entorno de Render
- Rotar JWT_SECRET regularmente

### Rate Limiting
```env
RATE_LIMIT_MAX_REQUESTS=1000  # Aumentar para producción
```

### CORS
```env
CLIENT_URL=https://tu-dominio.com  # Solo tu frontend
```

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render Dashboard
2. Verifica variables de entorno
3. Consulta la documentación de Render
4. Crea un issue en el repositorio