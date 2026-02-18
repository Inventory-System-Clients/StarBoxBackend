// Controller de contas financeiro
// Implemente a lógica real usando models do seu banco, aqui é mock igual backend-js
let bills = [
  {
    id: 1,
    name: 'Conta de Luz',
    status: 'pending',
    value: 100,
    amount: 100,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    category: 'Moradia',
    city: 'São Paulo',
    bill_type: 'company'
  },
  {
    id: 2,
    name: 'Conta de Água',
    status: 'paid',
    value: 50,
    amount: 50,
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    category: 'Moradia',
    city: 'São Paulo',
    bill_type: 'personal'
  }
];

export function getAll(req, res) {
  const { bill_type } = req.query;
  let filtered = bills;
  if (bill_type) {
    filtered = bills.filter(b => b.bill_type === bill_type);
  }
  res.json(filtered);
}

export function create(req, res) {
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
  res.json(bill);
}

export function update(req, res) {
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
  res.json(bills.find(b => b.id === id));
}

export function updateStatus(req, res) {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  for (let i = 0; i < bills.length; i++) {
    if (bills[i].id === id) {
      bills[i].status = status;
      break;
    }
  }
  res.json(bills.find(b => b.id === id));
}

export function deleteBill(req, res) {
  const id = parseInt(req.params.id);
  bills = bills.filter(b => b.id !== id);
  res.json({ success: true });
}

// Compatibilidade com rota
export { deleteBill as delete };
