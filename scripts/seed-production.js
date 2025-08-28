#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Product = require('../src/models/Product');
const Customer = require('../src/models/Customer');

async function seedProduction() {
    try {
        console.log('🌱 Inicializando base de datos de producción...');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Conectado a MongoDB Atlas');

        // Check if data already exists
        const productCount = await Product.countDocuments();
        const customerCount = await Customer.countDocuments();

        if (productCount > 0 && customerCount > 0) {
            console.log('✅ Base de datos ya inicializada');
            console.log(`📊 Productos: ${productCount}, Clientes: ${customerCount}`);
            process.exit(0);
        }

        // Load sample data
        const sampleProducts = require('../examples/sample-products.json');

        // Insert products
        await Product.deleteMany({});
        await Product.insertMany(sampleProducts);
        console.log(`✅ ${sampleProducts.length} productos insertados`);

        // Insert sample customers
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

        await Customer.deleteMany({});
        await Customer.insertMany(sampleCustomers);
        console.log(`✅ ${sampleCustomers.length} clientes insertados`);

        console.log('🎉 Base de datos de producción inicializada exitosamente');
        console.log('📊 Resumen:');
        console.log(`   Productos: ${sampleProducts.length}`);
        console.log(`   Clientes: ${sampleCustomers.length}`);

    } catch (error) {
        console.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    seedProduction();
}

module.exports = seedProduction;