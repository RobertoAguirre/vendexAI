require('dotenv').config();
const mongoose = require('mongoose');

async function fixCustomerIndexes() {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');

    const db = mongoose.connection.db;
    const collection = db.collection('customers');

    console.log('🔍 Verificando índices actuales...');
    const indexes = await collection.indexes();
    console.log('Índices actuales:', indexes.map(idx => idx.key));

    // Eliminar el índice simple de customerId si existe
    const customerIdIndex = indexes.find(idx => 
      Object.keys(idx.key).length === 1 && idx.key.customerId
    );

    if (customerIdIndex) {
      console.log('🗑️ Eliminando índice simple de customerId...');
      await collection.dropIndex(customerIdIndex.name);
      console.log('✅ Índice simple de customerId eliminado');
    } else {
      console.log('ℹ️ No se encontró índice simple de customerId');
    }

    // Verificar que el índice compuesto existe
    const compoundIndex = indexes.find(idx => 
      idx.key.businessId && idx.key.customerId && idx.unique
    );

    if (!compoundIndex) {
      console.log('🔧 Creando índice compuesto businessId + customerId...');
      await collection.createIndex(
        { businessId: 1, customerId: 1 }, 
        { unique: true, name: 'businessId_customerId_unique' }
      );
      console.log('✅ Índice compuesto creado');
    } else {
      console.log('✅ Índice compuesto ya existe');
    }

    console.log('🔍 Verificando índices finales...');
    const finalIndexes = await collection.indexes();
    console.log('Índices finales:', finalIndexes.map(idx => ({
      name: idx.name,
      key: idx.key,
      unique: idx.unique
    })));

    console.log('🎉 Índices corregidos exitosamente');
  } catch (error) {
    console.error('❌ Error corrigiendo índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

if (require.main === module) {
  fixCustomerIndexes();
}

module.exports = { fixCustomerIndexes };
