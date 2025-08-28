const express = require('express');
const Joi = require('joi');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// Esquemas de validación
const productSchema = Joi.object({
  productId: Joi.string().required(),
  name: Joi.string().required().max(200),
  description: Joi.string().required().max(2000),
  aiOptimizedDescription: Joi.string().required().max(3000),
  category: Joi.string().required().max(100),
  subcategory: Joi.string().max(100),
  pricing: Joi.object({
    basePrice: Joi.number().required().min(0),
    currency: Joi.string().default('USD'),
    compareAtPrice: Joi.number().min(0),
    discounts: Joi.array().items(Joi.object({
      type: Joi.string().valid('percentage', 'fixed', 'bulk').required(),
      value: Joi.number().required().min(0),
      minQuantity: Joi.number().min(1),
      validUntil: Joi.date(),
      conditions: Joi.string()
    }))
  }).required(),
  features: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    benefit: Joi.string().required(),
    priority: Joi.string().valid('high', 'medium', 'low').default('medium')
  })),
  specifications: Joi.object({
    technical: Joi.object().pattern(Joi.string(), Joi.any()),
    dimensions: Joi.object({
      length: Joi.number(),
      width: Joi.number(),
      height: Joi.number(),
      weight: Joi.number(),
      unit: Joi.string()
    })
  }),
  inventory: Joi.object({
    available: Joi.boolean().default(true),
    stock: Joi.number().min(0).default(0),
    lowStockThreshold: Joi.number().min(0).default(10)
  }),
  aiInsights: Joi.object({
    commonObjections: Joi.array().items(Joi.object({
      objection: Joi.string().required(),
      response: Joi.string().required(),
      effectiveness: Joi.number().min(0).max(1)
    })),
    bestSellingPoints: Joi.array().items(Joi.string()),
    targetCustomerProfile: Joi.object({
      demographics: Joi.array().items(Joi.string()),
      painPoints: Joi.array().items(Joi.string()),
      motivations: Joi.array().items(Joi.string())
    }),
    competitiveAdvantages: Joi.array().items(Joi.string()),
    upsellOpportunities: Joi.array().items(Joi.string()),
    crossSellOpportunities: Joi.array().items(Joi.string())
  }),
  content: Joi.object({
    images: Joi.array().items(Joi.string()),
    videos: Joi.array().items(Joi.string()),
    documents: Joi.array().items(Joi.string()),
    testimonials: Joi.array().items(Joi.object({
      customer: Joi.string().required(),
      content: Joi.string().required(),
      rating: Joi.number().min(1).max(5).required(),
      verified: Joi.boolean().default(false),
      date: Joi.date().default(Date.now)
    }))
  }),
  seo: Joi.object({
    keywords: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string())
  }),
  status: Joi.string().valid('active', 'inactive', 'discontinued', 'coming_soon').default('active')
});

const bulkSyncSchema = Joi.object({
  products: Joi.array().items(productSchema).required().min(1).max(100)
});

/**
 * @route POST /api/products/sync
 * @desc Sincronizar catálogo de productos
 * @access Private
 */
router.post('/sync', auth, validate(bulkSyncSchema), async (req, res) => {
  try {
    const { products } = req.body;
    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (const productData of products) {
      try {
        const existingProduct = await Product.findOne({ productId: productData.productId });
        
        if (existingProduct) {
          // Actualizar producto existente
          Object.assign(existingProduct, productData);
          await existingProduct.save();
          results.updated++;
        } else {
          // Crear nuevo producto
          const newProduct = new Product(productData);
          await newProduct.save();
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          productId: productData.productId,
          error: error.message
        });
      }
    }

    logger.info(`Sincronización de productos completada: ${results.created} creados, ${results.updated} actualizados, ${results.errors.length} errores`);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('Error sincronizando productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error sincronizando catálogo de productos'
    });
  }
});

/**
 * @route GET /api/products
 * @desc Obtener lista de productos
 * @access Private
 */
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const category = req.query.category;
    const status = req.query.status || 'active';
    const search = req.query.search;
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    let query = { status };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select('productId name description category pricing inventory salesData status');

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Error obteniendo productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo lista de productos'
    });
  }
});

/**
 * @route GET /api/products/:productId
 * @desc Obtener detalles de un producto específico
 * @access Private
 */
router.get('/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await Product.findOne({ productId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error('Error obteniendo producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo detalles del producto'
    });
  }
});

/**
 * @route PUT /api/products/:productId
 * @desc Actualizar un producto
 * @access Private
 */
router.put('/:productId', auth, validate(productSchema), async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;

    const product = await Product.findOne({ productId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    Object.assign(product, updateData);
    await product.save();

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    logger.error('Error actualizando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando producto'
    });
  }
});

/**
 * @route POST /api/products/:productId/sales
 * @desc Registrar venta de un producto
 * @access Private
 */
router.post('/:productId/sales', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, revenue, rating } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Cantidad debe ser mayor a 0'
      });
    }

    if (!revenue || revenue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Revenue debe ser mayor a 0'
      });
    }

    const product = await Product.findOne({ productId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Actualizar datos de ventas
    product.updateSalesData(quantity, revenue, rating);
    
    // Actualizar inventario
    if (product.inventory.stock >= quantity) {
      product.inventory.stock -= quantity;
    }

    await product.save();

    res.json({
      success: true,
      data: {
        productId: product.productId,
        salesData: product.salesData,
        inventory: product.inventory
      }
    });

  } catch (error) {
    logger.error('Error registrando venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error registrando venta del producto'
    });
  }
});

/**
 * @route GET /api/products/search
 * @desc Buscar productos
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, limit = 10 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro de búsqueda requerido'
      });
    }

    const filters = { status: 'active', 'inventory.available': true };
    
    if (category) {
      filters.category = category;
    }
    
    if (minPrice || maxPrice) {
      filters['pricing.basePrice'] = {};
      if (minPrice) filters['pricing.basePrice'].$gte = parseFloat(minPrice);
      if (maxPrice) filters['pricing.basePrice'].$lte = parseFloat(maxPrice);
    }

    const products = await Product.searchProducts(q, filters);
    
    // Calcular precios con descuentos
    const productsWithPricing = products.map(product => {
      const pricing = product.calculateDiscountedPrice(1);
      return {
        productId: product.productId,
        name: product.name,
        description: product.description,
        category: product.category,
        pricing,
        features: product.features.filter(f => f.priority === 'high').slice(0, 3),
        salesData: {
          averageRating: product.salesData.averageRating,
          reviewCount: product.salesData.reviewCount
        },
        inventory: {
          available: product.inventory.available,
          lowStock: product.isLowStock()
        }
      };
    });

    res.json({
      success: true,
      data: {
        query: q,
        products: productsWithPricing.slice(0, parseInt(limit)),
        total: productsWithPricing.length
      }
    });

  } catch (error) {
    logger.error('Error buscando productos:', error);
    res.status(500).json({
      success: false,
      error: 'Error en la búsqueda de productos'
    });
  }
});

/**
 * @route GET /api/products/categories
 * @desc Obtener categorías de productos
 * @access Public
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $match: { status: 'active' }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$pricing.basePrice' },
          subcategories: { $addToSet: '$subcategory' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      data: categories.map(cat => ({
        name: cat._id,
        productCount: cat.count,
        averagePrice: Math.round(cat.avgPrice * 100) / 100,
        subcategories: cat.subcategories.filter(Boolean)
      }))
    });

  } catch (error) {
    logger.error('Error obteniendo categorías:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo categorías de productos'
    });
  }
});

/**
 * @route GET /api/products/:productId/recommendations
 * @desc Obtener productos recomendados
 * @access Public
 */
router.get('/:productId/recommendations', async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    const product = await Product.findOne({ productId });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    // Obtener productos relacionados (upsell y cross-sell)
    const relatedProductIds = [
      ...product.aiInsights.upsellOpportunities || [],
      ...product.aiInsights.crossSellOpportunities || []
    ];

    let recommendations = [];

    if (relatedProductIds.length > 0) {
      recommendations = await Product.find({
        productId: { $in: relatedProductIds },
        status: 'active',
        'inventory.available': true
      }).limit(limit);
    }

    // Si no hay suficientes recomendaciones, buscar por categoría
    if (recommendations.length < limit) {
      const categoryRecommendations = await Product.find({
        category: product.category,
        productId: { $ne: productId, $nin: relatedProductIds },
        status: 'active',
        'inventory.available': true
      })
      .sort({ 'salesData.conversionRate': -1 })
      .limit(limit - recommendations.length);

      recommendations = [...recommendations, ...categoryRecommendations];
    }

    const recommendationsWithPricing = recommendations.map(rec => {
      const pricing = rec.calculateDiscountedPrice(1);
      return {
        productId: rec.productId,
        name: rec.name,
        description: rec.description,
        pricing,
        salesData: {
          averageRating: rec.salesData.averageRating,
          reviewCount: rec.salesData.reviewCount
        }
      };
    });

    res.json({
      success: true,
      data: {
        productId,
        recommendations: recommendationsWithPricing
      }
    });

  } catch (error) {
    logger.error('Error obteniendo recomendaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo productos recomendados'
    });
  }
});

module.exports = router;