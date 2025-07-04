const jwt = require('jsonwebtoken');
const redis = require('../config/redis');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']; 
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const blacklisted = await redis.get(`blacklist:${token}`);
  if (blacklisted) {
    return res.status(403).json({ error: 'Token expirado ou revogado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('Erro jwt.verify:', err.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
