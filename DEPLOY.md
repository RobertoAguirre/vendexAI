# 🚀 Deploy en Render - Vendex AI Sales Assistant

## ✅ **Pasos para Deploy:**

### **1. Preparar el repositorio:**
```bash
git add .
git commit -m "Ready for production deploy"
git push origin main
```

### **2. Crear cuenta en Render:**
- Ve a: https://render.com
- Regístrate con GitHub
- Conecta tu repositorio

### **3. Crear nuevo Web Service:**
- Click "New +" → "Web Service"
- Conecta tu repositorio GitHub
- Configuración:
  - **Name**: `vendex-ai-sales-assistant`
  - **Environment**: `Node`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Plan**: `Free` (para pruebas)

### **4. Variables de entorno en Render:**
⚠️ **IMPORTANTE**: En el dashboard de Render, ir a "Environment" y agregar estas variables una por una:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | `mongodb+srv://usuario:password@cluster.mongodb.net/vendex-ai?retryWrites=true&w=majority` |
| `JWT_SECRET` | `vendex_production_secret_2024_secure_key` |
| `JWT_EXPIRES_IN` | `7d` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | `100` |
| `LOG_LEVEL` | `info` |

🔒 **Nota de seguridad**: 
- Nunca subas archivos .env a Git
- Las variables se configuran directamente en Render
- Reemplaza los valores de ejemplo con tus credenciales reales
- La API key de Claude debe obtenerse de: https://console.anthropic.com/

### **5. Deploy automático:**
- Render detectará los cambios automáticamente
- El deploy tomará 2-3 minutos
- URL final: `https://vendex-ai-sales-assistant.onrender.com`

## 🎯 **URLs para el equipo:**

### **Chat Principal:**
```
https://vendex-ai-sales-assistant.onrender.com
```

### **Dashboard:**
```
https://vendex-ai-sales-assistant.onrender.com/dashboard.html
```

### **Productos:**
```
https://vendex-ai-sales-assistant.onrender.com/products.html
```

## 🧪 **Probar después del deploy:**

### **Health Check:**
```bash
curl https://vendex-ai-sales-assistant.onrender.com/health
```

### **Test completo:**
```bash
npm run test-prod
```

## ⚠️ **Notas importantes:**

1. **Plan Free de Render**: Se duerme después de 15 min de inactividad
2. **Primera carga**: Puede tomar 30-60 segundos en despertar
3. **MongoDB Atlas**: Ya está configurado y funcionando
4. **Sin Redis**: Funciona en memoria para el plan free

## 🎉 **¡Listo para el equipo de ventas!**

Comparte estas URLs con tu equipo:
- **Chat**: https://vendex-ai-sales-assistant.onrender.com
- **Dashboard**: https://vendex-ai-sales-assistant.onrender.com/dashboard.html

El asistente estará disponible 24/7 para pruebas y demostraciones.