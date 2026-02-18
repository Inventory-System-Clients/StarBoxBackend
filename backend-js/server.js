// WhatsApp notification
const { sendWhatsAppMessage } = require('./services/whatsappService');
const { bills } = require('./models/bill');

// Função para checar contas em atenção e notificar
function checkAndNotifyAttentionBills() {
  const now = new Date();
  const attentionBills = bills.filter(b => {
    if (b.status === 'paid' || !b.due_date) return false;
    const due = new Date(b.due_date);
    const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    return days <= 3 && days >= 0;
  });
  if (attentionBills.length > 0) {
    attentionBills.forEach(bill => {
      const msg = `Atenção! Conta a pagar: ${bill.name || bill.account} no valor de R$ ${bill.amount.toFixed(2)} vence em ${bill.due_date}.`;
      sendWhatsAppMessage(msg);
    });
  }
}

// Checa a cada 1 hora
setInterval(checkAndNotifyAttentionBills, 60 * 60 * 1000);
// Checa também ao iniciar
checkAndNotifyAttentionBills();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Example route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend-js!' });
});

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/reports', require('./routes/reports'));

app.listen(PORT, () => {
  console.log(`Backend JS rodando em http://localhost:${PORT}`);
});
