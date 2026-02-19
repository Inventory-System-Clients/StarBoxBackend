import ContasFinanceiro from "../../models/ContasFinanceiro.js";

export function getAll(req, res) {
  const { bill_type } = req.query;
  const where = bill_type ? { bill_type } : {};
  ContasFinanceiro.findAll({ where })
    .then((bills) => res.json(bills))
    .catch((err) => {
      console.error("Erro detalhado getAll:", err);
      res.status(500).json({ error: err.message });
    });
}

export function create(req, res) {
  const amount = req.body.amount ?? req.body.value ?? 0;
  ContasFinanceiro.create({
    name: req.body.name,
    status: req.body.status || "pending",
    value: amount,
    due_date: req.body.due_date || new Date().toISOString().slice(0, 10),
    category: req.body.category || "",
    city: req.body.city || "",
    bill_type: req.body.bill_type || "personal",
    observations: req.body.observations || "",
  })
    .then((bill) => res.json(bill))
    .catch((err) => {
      console.error("Erro detalhado create:", err);
      res.status(500).json({ error: err.message });
    });
}

export function update(req, res) {
  const id = parseInt(req.params.id);
  const amount = req.body.amount ?? req.body.value ?? 0;
  ContasFinanceiro.update(
    {
      name: req.body.name,
      status: req.body.status,
      value: amount,
      due_date: req.body.due_date,
      category: req.body.category,
      city: req.body.city,
      bill_type: req.body.bill_type,
      observations: req.body.observations,
    },
    { where: { id } },
  )
    .then(() => ContasFinanceiro.findByPk(id))
    .then((bill) => res.json(bill))
    .catch((err) => {
      console.error("Erro detalhado update:", err);
      res.status(500).json({ error: err.message });
    });
}

export function updateStatus(req, res) {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  ContasFinanceiro.update({ status }, { where: { id } })
    .then(() => ContasFinanceiro.findByPk(id))
    .then((bill) => res.json(bill))
    .catch((err) => {
      console.error("Erro detalhado updateStatus:", err);
      res.status(500).json({ error: err.message });
    });
}

export function deleteBill(req, res) {
  const id = parseInt(req.params.id);
  ContasFinanceiro.destroy({ where: { id } })
    .then(() => res.json({ success: true }))
    .catch((err) => {
      console.error("Erro detalhado deleteBill:", err);
      res.status(500).json({ error: err.message });
    });
}

// Compatibilidade com rota
export { deleteBill as delete };
