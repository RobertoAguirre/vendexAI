const sampleProducts = require('../examples/sample-products.json');
require('dotenv').config();

async function seedDatabase() {
  try {
    // Intentar conectar a MongoDB, si no usar memoria
    let usingMemory = false;
    try {
      const mongoose = require('mongoose');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('📦 Conectado a MongoDB');
      
      const Product = require('../src/models/Product');
      const Customer = require('../src/models/Customer');
      
      // Limpiar datos existentes
      await Product.deleteMany({});
      await Customer.deleteMany({});
      console.log('🧹 Base de datos limpiada');
      
    } catch (error) {
      console.log('⚠️  MongoDB no disponible, usando base de datos en memoria');
      const connectMemoryDB = require('../src/config/database-memory');
      await connectMemoryDB();
      usingMemory = true;
    }

    // Obtener modelos (MongoDB o memoria)
    const Product = global.Product || require('../src/models/Product');
    const Customer = global.Customer || require('../src/models/Customer');

    // Insertar productos de ejemplo
    await Product.insertMany(sampleProducts);
    console.log(`✅ ${sampleProducts.length} productos insertados`);

    // Crear clientes de ejemplo
    const sampleCustomers = [
      {
        customerId: 'customer_001',
        name: 'Ana García',
        email: 'ana.garcia@email.com',
        phone: '+1234567890',
        preferences: {
          communicationStyle: 'formal',
          interests: ['tecnología', 'productividad'],
          budgetRange: { min: 500, max: 2000 }
        },
        profile: {
          customerType: 'new',
          lifetimeValue: 0,
          totalPurchases: 0
        },
        behavior: {
          engagementLevel: 'medium',
          conversionProbability: 0.6
        }
      },
      {
        customerId: 'customer_002',
        name: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@email.com',
        phone: '+1234567891',
        preferences: {
          communicationStyle: 'casual',
          interests: ['gaming', 'diseño'],
          budgetRange: { min: 1000, max: 3000 }
        },
        profile: {
          customerType: 'returning',
          lifetimeValue: 1500,
          totalPurchases: 2
        },
        behavior: {
          engagementLevel: 'high',
          conversionProbability: 0.8
        }
      },
      {
        customerId: 'customer_003',
        name: 'María López',
        email: 'maria.lopez@email.com',
        phone: '+1234567892',
        preferences: {
          communicationStyle: 'technical',
          interests: ['programación', 'desarrollo'],
          budgetRange: { min: 800, max: 2500 }
        },
        profile: {
          customerType: 'vip',
          lifetimeValue: 5000,
          totalPurchases: 5
        },
        behavior: {
          engagementLevel: 'high',
          conversionProbability: 0.9
        }
      }
    ];

    await Customer.insertMany(sampleCustomers);
    console.log(`✅ ${sampleCustomers.length} clientes insertados`);

    console.log('🎉 Base de datos inicializada exitosamente');
    
    // Mostrar resumen
    const productCount = await Product.countDocuments();
    const customerCount = await Customer.countDocuments();
    
    console.log('\n📊 Resumen:');
    console.log(`   Productos: ${productCount}`);
    console.log(`   Clientes: ${customerCount}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;