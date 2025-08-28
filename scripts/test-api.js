#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

async function testAPI() {
  console.log(`🧪 Probando API en: ${BASE_URL}\n`);

  try {
    // 1. Health Check
    console.log('1. 🏥 Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health:', health.data.status);

    // 2. Login
    console.log('\n2. 🔐 Probando autenticación...');
    const login = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@vendex.com',
      password: 'password'
    });
    const token = login.data.data.token;
    console.log('✅ Login exitoso, token obtenido');

    // 3. Mensaje al asistente
    console.log('\n3. 💬 Probando asistente de ventas...');
    const chatResponse = await axios.post(`${BASE_URL}/api/chat/message`, {
      customerId: 'test_customer_001',
      message: 'Hola, estoy buscando una laptop para trabajo',
      channel: 'web'
    });
    
    console.log('✅ Asistente respondió:');
    console.log(`   Lead Score: ${chatResponse.data.data.metadata.leadScore}`);
    console.log(`   Probabilidad: ${Math.round(chatResponse.data.data.metadata.conversionProbability * 100)}%`);
    console.log(`   Respuesta: ${chatResponse.data.data.message.substring(0, 100)}...`);

    // 4. Buscar productos
    console.log('\n4. 🔍 Probando búsqueda de productos...');
    const products = await axios.get(`${BASE_URL}/api/products/search?q=laptop&limit=3`);
    console.log(`✅ Encontrados ${products.data.data.products.length} productos`);

    // 5. Analytics
    console.log('\n5. 📊 Probando analytics...');
    const analytics = await axios.get(`${BASE_URL}/api/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Dashboard data obtenida');
    console.log(`   Conversaciones hoy: ${analytics.data.data.summary.todayConversations}`);

    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ Servidor funcionando');
    console.log('   ✅ Autenticación OK');
    console.log('   ✅ Asistente de ventas OK');
    console.log('   ✅ Búsqueda de productos OK');
    console.log('   ✅ Analytics OK');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data.error || error.response.data.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar que el servidor esté ejecutándose');
    console.log('   2. Ejecutar: npm run check');
    console.log('   3. Verificar que MongoDB y Redis estén activos');
    console.log('   4. Revisar el archivo .env');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testAPI();
}

module.exports = testAPI;