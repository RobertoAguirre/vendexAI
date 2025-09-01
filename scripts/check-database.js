require('dotenv').config();
require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../src/models/Business');
const Product = require('../src/models/Product');
const Customer = require('../src/models/Customer');
const Conversation = require('../src/models/Conversation');
const logger = require('../src/utils/logger');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI;

async function checkDatabase() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI no está configurada');
      console.log('📝 Por favor, configura tu URL de MongoDB Atlas en el archivo .env');
      process.exit(1);
    }
    
    console.log('🔌 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    console.log('\n📊 VERIFICANDO BASE DE DATOS:');
    console.log('================================');
    
    // Verificar negocios
    const businesses = await Business.find({});
    console.log(`🏢 Negocios: ${businesses.length}`);
    businesses.forEach(business => {
      console.log(`   - ${business.name} (${business.businessId}) - ${business.industry}`);
    });
    
    // Verificar productos
    const products = await Product.find({});
    console.log(`📦 Productos totales: ${products.length}`);
    
    // Agrupar productos por negocio
    const productsByBusiness = await Product.aggregate([
      {
        $group: {
          _id: '$businessId',
          count: { $sum: 1 },
          products: { $push: { name: '$name', price: '$pricing.basePrice' } }
        }
      }
    ]);
    
    productsByBusiness.forEach(group => {
      console.log(`   - Negocio ${group._id}: ${group.count} productos`);
      group.products.slice(0, 3).forEach(product => {
        console.log(`     * ${product.name} - $${product.price}`);
      });
      if (group.products.length > 3) {
        console.log(`     ... y ${group.products.length - 3} más`);
      }
    });
    
    // Verificar clientes
    const customers = await Customer.find({});
    console.log(`👥 Clientes totales: ${customers.length}`);
    
    // Verificar conversaciones
    const conversations = await Conversation.find({});
    console.log(`💬 Conversaciones totales: ${conversations.length}`);
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando base de datos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB Atlas');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };
