const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

console.log('AUTH MANAGER INITIALIZED');

const USERS_FILE = path.join(__dirname, '..', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Load users from file
async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading users:', error.message);
    return {};
  }
}

// Save users to file
async function saveUsers(users) {
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving users:', error.message);
    return false;
  }
}

// Validate credentials
async function validateCredentials(username, password) {
  try {
    const users = await loadUsers();
    const user = users[username];
    
    if (!user || !user.active) {
      return { success: false, message: 'User not found or inactive' };
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return { success: false, message: 'Incorrect password' };
    }
    
    // Create JWT token
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
    console.error('Error validating credentials:', error.message);
    return { success: false, message: 'Internal error' };
  }
}

// Verify JWT token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
}

// Create new user (admin only) - VERSION WITH EMAIL
async function createUser(username, password, name, email, role = 'user') {
  try {
    const users = await loadUsers();
    
    if (users[username]) {
      return { success: false, message: 'User already exists' };
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, message: 'Invalid email' };
    }
    
    // Check if email is already in use
    const emailInUse = Object.values(users).some(user => user.email === email);
    if (emailInUse) {
      return { success: false, message: 'Email is already in use' };
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    users[username] = {
      password: hashedPassword,
      role: role,
      name: name,
      email: email,
      created: new Date().toISOString().split('T')[0],
      active: true
    };
    
    const saved = await saveUsers(users);
    
    if (saved) {
      return { success: true, message: 'User created successfully' };
    } else {
      return { success: false, message: 'Error saving user' };
    }
    
  } catch (error) {
    console.error('Error creating user:', error.message);
    return { success: false, message: 'Internal error' };
  }
}

// List users (admin only) - VERSION WITH EMAIL
async function listUsers() {
  try {
    const users = await loadUsers();
    const list = Object.keys(users).map(username => ({
      username: username,
      name: users[username].name,
      email: users[username].email || 'No email',
      role: users[username].role,
      created: users[username].created,
      active: users[username].active
    }));
    
    return { success: true, users: list };
  } catch (error) {
    return { success: false, message: 'Error loading users' };
  }
}

// Authentication middleware for Express
function requireAuth(req, res, next) {
  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  const verification = verifyToken(token);
  
  if (!verification.success) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
  req.user = verification.user;
  next();
}

// Admin-only middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Administrator permissions required' });
  }
  next();
}

module.exports = {
  validateCredentials,
  verifyToken,
  createUser,
  listUsers,
  requireAuth,
  requireAdmin
};
