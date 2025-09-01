require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('../src/models/Business');
const Product = require('../src/models/Product');
const logger = require('../src/utils/logger');

// Configuración de la base de datos
const MONGODB_URI = process.env.MONGODB_URI;

async function importVendexProducts() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI no está configurada');
      console.log('📝 Por favor, crea un archivo .env con tu URL de MongoDB Atlas:');
      console.log('MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/vendexai?retryWrites=true&w=majority');
      process.exit(1);
    }
    
    console.log('🔌 Conectando a MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Conectado a MongoDB Atlas');

    // Crear o obtener el negocio de flores
    const businessId = '6852153db671984b247ca2b2';
    let business = await Business.findOne({ businessId });
    
    if (!business) {
      business = new Business({
        businessId,
        name: 'Florería Vendex',
        description: 'Tienda de flores y arreglos florales',
        industry: 'flowers',
        contact: {
          email: 'info@vendex.mx',
          website: 'https://vendex.mx'
        },
        status: 'active',
        subscription: {
          plan: 'premium',
          startDate: new Date(),
          features: ['ai_assistant', 'inventory_management', 'analytics']
        }
      });
      await business.save();
      logger.info('Negocio creado:', business.name);
    } else {
      logger.info('Negocio encontrado:', business.name);
    }

    // Obtener productos de la API de Vendex
    const response = await fetch('https://vendex.mx/api/database/business/6852153db671984b247ca2b2/product');
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      throw new Error('Formato de respuesta inválido');
    }

    logger.info(`Importando ${data.products.length} productos...`);

    // Procesar cada producto
    for (const vendexProduct of data.products) {
      try {
        // Verificar si el producto ya existe
        const existingProduct = await Product.findOne({
          businessId,
          productId: vendexProduct._id
        });

        if (existingProduct) {
          logger.info(`Producto ${vendexProduct.name} ya existe, actualizando...`);
          
          // Actualizar datos del producto
          existingProduct.name = vendexProduct.name;
          existingProduct.description = vendexProduct.description;
          existingProduct.aiOptimizedDescription = generateAIOptimizedDescription(vendexProduct);
          existingProduct.category = 'flores';
          existingProduct.pricing.basePrice = vendexProduct.price;
          existingProduct.pricing.currency = 'MXN';
          existingProduct.inventory.stock = vendexProduct.quantity;
          existingProduct.inventory.available = vendexProduct.quantity > 0;
          existingProduct.content.images = vendexProduct.images || [];
          existingProduct.status = 'active';
          
          await existingProduct.save();
        } else {
          // Crear nuevo producto
          const newProduct = new Product({
            businessId,
            productId: vendexProduct._id,
            name: vendexProduct.name,
            description: vendexProduct.description,
            aiOptimizedDescription: generateAIOptimizedDescription(vendexProduct),
            category: 'flores',
            pricing: {
              basePrice: vendexProduct.price,
              currency: 'MXN'
            },
            features: generateFeatures(vendexProduct),
            inventory: {
              available: vendexProduct.quantity > 0,
              stock: vendexProduct.quantity,
              lowStockThreshold: 10
            },
            content: {
              images: vendexProduct.images || []
            },
            status: 'active',
            aiInsights: {
              bestSellingPoints: generateSellingPoints(vendexProduct),
              targetCustomerProfile: {
                demographics: ['todos'],
                painPoints: ['necesidad de expresar sentimientos', 'ocasiones especiales'],
                motivations: ['celebrar', 'expresar amor', 'agradecer']
              }
            }
          });

          await newProduct.save();
          logger.info(`Producto creado: ${vendexProduct.name}`);
        }
      } catch (error) {
        logger.error(`Error procesando producto ${vendexProduct.name}:`, error.message);
      }
    }

    logger.info('Importación completada exitosamente');
    
    // Mostrar estadísticas
    const totalProducts = await Product.countDocuments({ businessId });
    const activeProducts = await Product.countDocuments({ businessId, status: 'active' });
    const availableProducts = await Product.countDocuments({ businessId, 'inventory.available': true });
    
    logger.info(`Estadísticas finales:`);
    logger.info(`- Total de productos: ${totalProducts}`);
    logger.info(`- Productos activos: ${activeProducts}`);
    logger.info(`- Productos disponibles: ${availableProducts}`);

  } catch (error) {
    logger.error('Error en la importación:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Desconectado de MongoDB');
  }
}

function generateAIOptimizedDescription(product) {
  return `${product.name}: ${product.description}. Producto de alta calidad disponible en nuestra florería. Precio: $${product.price} MXN. Stock disponible: ${product.quantity} unidades.`;
}

function generateFeatures(product) {
  const features = [];
  
  if (product.description.includes('rosas')) {
    features.push({
      name: 'Rosas Frescas',
      description: 'Rosas de la mejor calidad',
      benefit: 'Belleza y durabilidad garantizadas',
      priority: 'high'
    });
  }
  
  if (product.description.includes('caja')) {
    features.push({
      name: 'Presentación en Caja',
      description: 'Arreglo presentado en caja elegante',
      benefit: 'Presentación profesional y elegante',
      priority: 'high'
    });
  }
  
  if (product.description.includes('claveles')) {
    features.push({
      name: 'Claveles',
      description: 'Claveles frescos incluidos',
      benefit: 'Variedad y color en el arreglo',
      priority: 'medium'
    });
  }
  
  return features;
}

function generateSellingPoints(product) {
  const sellingPoints = [];
  
  if (product.price < 1000) {
    sellingPoints.push('Excelente relación calidad-precio');
  }
  
  if (product.description.includes('rosas')) {
    sellingPoints.push('Rosas frescas de la mejor calidad');
  }
  
  if (product.description.includes('caja')) {
    sellingPoints.push('Presentación elegante en caja');
  }
  
  sellingPoints.push('Entrega rápida y segura');
  sellingPoints.push('Garantía de frescura');
  
  return sellingPoints;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  importVendexProducts();
}

module.exports = { importVendexProducts };
