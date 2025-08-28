const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error no manejado:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    return res.status(400).json({
      success: false,
      error: 'Error de validación',
      details: errors
    });
  }
  
  // Error de duplicado de MongoDB
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `El ${field} ya existe`
    });
  }
  
  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
  
  // Error de conexión a la base de datos
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      error: 'Error de conexión a la base de datos'
    });
  }
  
  // Error genérico del servidor
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Error interno del servidor' 
      : err.message
  });
};

module.exports = errorHandler;