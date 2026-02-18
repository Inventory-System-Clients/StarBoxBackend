// Controller de categorias financeiro
// Implemente a lógica real usando models do seu banco, aqui é mock igual backend-js
let categories = [
  { id: 1, name: 'Moradia' },
  { id: 2, name: 'Transporte' }
];

export function getAll(req, res) {
  res.json(categories);
}

export function create(req, res) {
  const { name } = req.body;
  const category = { id: categories.length + 1, name };
  categories.push(category);
  res.json(category);
}
