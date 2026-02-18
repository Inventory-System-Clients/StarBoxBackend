// Bill model (in-memory)
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

module.exports = {
  bills
};
