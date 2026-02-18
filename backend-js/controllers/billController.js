// Bill controller
const { bills } = require('../models/bill');

exports.getAll = (req, res) => {
  const { bill_type } = req.query;
  let filtered = bills;
  if (bill_type) {
    filtered = bills.filter(b => b.bill_type === bill_type);
  }
  res.json(filtered);
};

exports.create = (req, res) => {
  const amount = req.body.amount ?? req.body.value ?? 0;
  const bill = {
    id: bills.length + 1,
    name: req.body.name,
    status: req.body.status || 'pending',
    value: amount,
    amount,
    due_date: req.body.due_date || new Date().toISOString().slice(0, 10),
    category: req.body.category || '',
    city: req.body.city || '',
    bill_type: req.body.bill_type || 'personal'
  };
  bills.push(bill);
  // Notifica imediatamente após criar
  try {
    const { checkAndNotifyAttentionBills } = require('../server');
    checkAndNotifyAttentionBills();
  } catch (e) {}
  res.json(bill);
};

exports.update = (req, res) => {
  const id = parseInt(req.params.id);
  const amount = req.body.amount ?? req.body.value ?? 0;
  for (let i = 0; i < bills.length; i++) {
    if (bills[i].id === id) {
      bills[i] = {
        ...bills[i],
        ...req.body,
        amount,
        value: amount,
        due_date: req.body.due_date || bills[i].due_date,
        category: req.body.category || bills[i].category,
        city: req.body.city || bills[i].city,
        bill_type: req.body.bill_type || bills[i].bill_type
      };
      break;
    }
  }
  // Notifica imediatamente após editar
  try {
    const { checkAndNotifyAttentionBills } = require('../server');
    checkAndNotifyAttentionBills();
  } catch (e) {}
  res.json(bills.find(b => b.id === id));
};

exports.updateStatus = (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  for (let i = 0; i < bills.length; i++) {
    if (bills[i].id === id) {
      bills[i].status = status;
      break;
    }
  }
  // Notifica imediatamente após mudar status
  try {
    const { checkAndNotifyAttentionBills } = require('../server');
    checkAndNotifyAttentionBills();
  } catch (e) {}
  res.json(bills.find(b => b.id === id));
};

exports.delete = (req, res) => {
  const id = parseInt(req.params.id);
  const idx = bills.findIndex(b => b.id === id);
  if (idx !== -1) bills.splice(idx, 1);
  res.json({ success: true });
};
