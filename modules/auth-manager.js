const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

console.log('🔐 AUTH MANAGER INITIALIZED');

const USERS_FILE = path.join(__dirname, '..', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Cargar users desde archivo
async function cargarUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ Error cargando users:', error.message);
    return {};
  }
}

// Guardar users en archivo
async function guardarUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Error guardando users:', error.message);
    return false;
  }
}

// Validar credenciales
async function validarCredenciales(username, password) {
  try {
    const users = await cargarUsers();
    const user = users[username];
    
    if (!user || !user.active) {
      return { success: false, message: 'User not found o inactive' };
    }
    
    const passwordValida = await bcrypt.compare(password, user.password);
    
    if (!passwordValida) {
      return { success: false, message: 'Incorrect password' };
    }
    
    // Crear JWT token
    const token = jwt.sign(
      { 
        username: username,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: process.env.SESSION_DURATION || '24h' }
    );
    
    return {
      success: true,
      token: token,
      user: {
        username: username,
        role: user.role,
        name: user.name
      }
    };
    
  } catch (error) {
    console.error('❌ Error validando credenciales:', error.message);
    return { success: false, message: 'Error interno' };
  }
}

// Verificar JWT token
function verificarToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
}

// Crear nuevo user (solo admin)
// Crear nuevo user (solo admin) - VERSIÓN CON EMAIL
async function crearUser(username, password, name, email, role = 'user') {
  try {
    const users = await cargarUsers();
    
    if (users[username]) {
      return { success: false, message: 'User ya existe' };
    }
    
    // Validar email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Email inválido' };
    }
    
    // Verificar que el email no esté en uso
    const emailEnUso = Object.values(users).some(user => user.email === email);
    if (emailEnUso) {
      return { success: false, message: 'Email ya está en uso' };
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    users[username] = {
      password: hashedPassword,
      role: role,
      name: name,
      email: email, // NUEVO CAMPO
      created: new Date().toISOString().split('T')[0],
      active: true
    };
    
    const guardado = await guardarUsers(users);
    
    if (guardado) {
      return { success: true, message: 'User created successfully' };
    } else {
      return { success: false, message: 'Error guardando user' };
    }
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    return { success: false, message: 'Error interno' };
  }
}

// Listar users (solo admin)
// Listar users (solo admin) - VERSIÓN CON EMAIL
async function listarUsers() {
  try {
    const users = await cargarUsers();
    const lista = Object.keys(users).map(username => ({
      username: username,
      name: users[username].name,
      email: users[username].email || 'Sin email', // NUEVO CAMPO
      role: users[username].role,
      created: users[username].created,
      active: users[username].active
    }));
    
    return { success: true, users: lista };
  } catch (error) {
    return { success: false, message: 'Error cargando users' };
  }
}

// Middleware de autenticación para Express
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }
  
  const verification = verificarToken(token);
  
  if (!verification.success) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
  req.user = verification.user;
  next();
}

// Middleware solo para admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Se requieren permisos de administrador' });
  }
  next();
}

module.exports = {
  validarCredenciales,
  verificarToken,
  crearUser,
  listarUsers,
  requireAuth,
  requireAdmin
};