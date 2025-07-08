require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('./config/redis');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();
app.use(express.json());

// Rota para acessar a documentação Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const profileRoutes = require('./routes/profile');

/**
 * Função para criar a tabela de usuários, caso não exista.
 */
async function criarTabelaUsuarios() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL
    );
  `;
  await pool.query(query);
}

app.use(profileRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'Serviço de Auth Rodando' });
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registro do usuário
 *     description: Registra um novo usuário e retorna uma mensagem de sucesso com o ID do usuário.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: user1
 *               password:
 *                 type: string
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuário criado com sucesso
 *                 userId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Usuário já existe
 *       500:
 *         description: Erro ao registrar usuário
 */
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id';
    const result = await pool.query(query, [username, hash]);
    res.json({ message: 'Usuário criado com sucesso', userId: result.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Usuário já existe' });
    }
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login do usuário
 *     description: Realiza o login e retorna um token JWT.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: user1
 *               password:
 *                 type: string
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT gerado para autenticação
 *       400:
 *         description: Usuário ou senha inválidos
 *       500:
 *         description: Erro ao realizar login
 */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Usuário ou senha inválidos' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Usuário ou senha inválidos' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout do usuário
 *     description: Realiza o logout e invalida o token JWT.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwidXNlcm5hbWUiOiJ1c2VyMSIsImV4cCI6MTY5MjM4NTkzNX0.k6MwXrxmY__wXFF6CZ1PjGzVswNkQeCpIQf7lx9hD9s"
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout realizado com sucesso
 *       400:
 *         description: Token não fornecido ou inválido
 */
app.post('/logout', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresInSec = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresInSec <= 0) {
      return res.status(400).json({ error: 'Token já expirado' });
    }

    await redis.set(`blacklist:${token}`, 'true', { EX: expiresInSec });

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (err) {
    console.error('Erro no logout:', err);
    res.status(400).json({ error: 'Token inválido', message: err.message });
  }
});

const PORT = 3001;

pool.connect()
  .then(() => {
    console.log('Conectado ao Postgres');
    return criarTabelaUsuarios();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serviço de Auth rodando na porta ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erro ao conectar no banco', err);
  });
