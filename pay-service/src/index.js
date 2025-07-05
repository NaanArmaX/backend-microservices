const express = require('express');
const Stripe = require('stripe');
require('dotenv').config();

// Inicializa o Stripe com a chave secreta
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());  


app.get('/stripe/clients', async (req, res) => {
  try {
    // Buscando todos os clientes do Stripe
    const customers = await stripe.customers.list({
      limit: 100, 
    });

    // Verifica se retornou algum cliente
    if (customers.data.length === 0) {
      return res.status(404).json({ message: 'Nenhum cliente encontrado na Stripe.' });
    }

    // Retorna a lista de clientes
    res.json(customers.data);
  } catch (error) {
    console.error('Erro ao buscar clientes da Stripe:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes da Stripe.' });
  }
});

app.post('/stripe/clients', async (req, res) => {
  const { email, name } = req.body;

  try {
    // Criando um novo cliente na Stripe
    const customer = await stripe.customers.create({
      email: email,
      name: name,
    });

    res.status(201).json({
      message: 'Cliente criado com sucesso!',
      customer: customer,
    });
  } catch (error) {
    console.error('Erro ao criar cliente na Stripe:', error);
    res.status(500).json({ error: 'Erro ao criar cliente na Stripe' });
  }
});

// Rota de healthcheck
app.get('/health', (req, res) => {
    res.json({ status: 'Payments Service Rodando' });
});

// Configurar a porta do serviço
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Payments Service rodando na porta ${PORT}`);
});
