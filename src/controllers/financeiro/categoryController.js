import FinanceiroCategory from "../../models/FinanceiroCategory.js";

export function getAll(req, res) {
  FinanceiroCategory.findAll()
    .then((categories) => res.json(categories))
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function create(req, res) {
  const { name } = req.body;
  FinanceiroCategory.create({ name })
    .then((category) => res.json(category))
    .catch((err) => res.status(500).json({ error: err.message }));
}
