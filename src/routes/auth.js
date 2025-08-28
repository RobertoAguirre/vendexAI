const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const validate = require('../middleware/validate');
const logger = require('../utils/logger');

const router = express.Router();

// Esquemas de validación
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required().min(6)
});

const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(6).max(128),
  role: Joi.string().valid('admin', 'agent', 'viewer').default('agent')
});

// Simulación de base de datos de usuarios (en producción usar MongoDB)
const users = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@vendex.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin'
  },
  {
    id: '2',
    name: 'Sales Agent',
    email: 'agent@vendex.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'agent'
  }
];

/**
 * @route POST /api/auth/login
 * @desc Autenticar usuario
 * @access Public
 */
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Buscar usuario
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }
    
    // Generar JWT
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    logger.info(`Usuario autenticado: ${email}`);
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    logger.error('Error en login:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/auth/register
 * @desc Registrar nuevo usuario
 * @access Public (en producción debería ser privado/admin)
 */
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya existe'
      });
    }
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Crear nuevo usuario
    const newUser = {
      id: (users.length + 1).toString(),
      name,
      email,
      password: hashedPassword,
      role
    };
    
    users.push(newUser);
    
    // Generar JWT
    const token = jwt.sign(
      { 
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    logger.info(`Nuevo usuario registrado: ${email}`);
    
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
    
  } catch (error) {
    logger.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Renovar token JWT
 * @access Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token requerido'
      });
    }
    
    // Verificar token actual (incluso si está expirado)
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        decoded = jwt.decode(token);
      } else {
        return res.status(401).json({
          success: false,
          error: 'Token inválido'
        });
      }
    }
    
    // Buscar usuario
    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    // Generar nuevo token
    const newToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    
    res.json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    logger.error('Error renovando token:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Obtener información del usuario actual
 * @access Private
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token requerido'
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
    
  } catch (error) {
    logger.error('Error obteniendo usuario:', error);
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Cerrar sesión (invalidar token)
 * @access Private
 */
router.post('/logout', (req, res) => {
  // En una implementación real, podrías mantener una lista negra de tokens
  // o usar Redis para invalidar tokens
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

module.exports = router;