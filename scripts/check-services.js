#!/usr/bin/env node

const mongoose = require('mongoose');
const redis = require('redis');

async function checkServices() {
  console.log('🔍 Verificando servicios requeridos...\n');
  
  let allGood = true;

  // Verificar MongoDB
  try {
    console.log('📦 Verificando MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ MongoDB está ejecutándose');
    await mongoose.disconnect();
  } catch (error) {
    console.log('❌ MongoDB no está disponible');
    console.log('   Ejecuta: mongod');
    allGood = false;
  }

  // Verificar Redis
  try {
    console.log('🔴 Verificando Redis...');
    const client = redis.createClient({ url: 'redis://localhost:6379' });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'));
      }, 3000);
      
      client.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      
      client.connect();
    });
    
    console.log('✅ Redis está ejecutándose');
    await client.quit();
  } catch (error) {
    console.log('❌ Redis no está disponible');
    console.log('   Ejecuta: redis-server');
    allGood = false;
  }

  // Verificar variables de entorno
  console.log('🔧 Verificando variables de entorno...');
  require('dotenv').config();
  
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.log('❌ ANTHROPIC_API_KEY no configurada');
    console.log('   Edita el archivo .env con tu API key de Claude');
    allGood = false;
  } else {
    console.log('✅ ANTHROPIC_API_KEY configurada');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_jwt_key_here') {
    console.log('⚠️  JWT_SECRET usando valor por defecto (cambiar en producción)');
  } else {
    console.log('✅ JWT_SECRET configurado');
  }

  console.log('\n' + '='.repeat(50));
  
  if (allGood) {
    console.log('🎉 ¡Todos los servicios están listos!');
    console.log('Puedes ejecutar: npm run dev');
  } else {
    console.log('⚠️  Algunos servicios necesitan configuración');
    console.log('Revisa los errores arriba antes de continuar');
  }
}

checkServices().catch(console.error);