const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');

router.get('/profile', authenticateToken, (req, res) => {
  res.json({ message: 'Dados do perfil do usuário', user: req.user });
});

module.exports = router;
