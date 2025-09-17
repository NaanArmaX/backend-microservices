require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const Redis = require('ioredis');

const app = express();
const redisClient = new Redis(process.env.REDIS_URL);

const JWT_SECRET = process.env.JWT_SECRET;


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}


const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, 
  max: 100, 
  standardHeaders: true,
  legacyHeaders: false,
});

const proxyOptions = {
  changeOrigin: true,
  secure: false,
};



app.use(limiter);

const publicRoutes = [
  '/auth/login',
  '/auth/register',
];

function conditionalAuth(req, res, next) {
  const fullPath = req.baseUrl + req.path;
  const isPublic = publicRoutes.some(route => fullPath.startsWith(route));
  if (isPublic) return next();
  return authenticateToken(req, res, next);
}

app.use('/auth', conditionalAuth, createProxyMiddleware({
  ...proxyOptions,
  target: 'http://auth-service:3001',
  pathRewrite: {'^/auth': ''},
}));

app.use('/payment', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: 'http://pay-service:3002',
  pathRewrite: {'^/payment': ''},
}));

app.use('/resource', authenticateToken, createProxyMiddleware({
  ...proxyOptions,
  target: 'http://resource-service:3003',
  pathRewrite: {'^/resource': ''},
}));


app.get('/health', (req, res) => res.json({ status: 'API Gateway rodando' }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API Gateway rodando na porta ${PORT}`);
});
