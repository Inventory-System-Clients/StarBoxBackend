import ContasFinanceiro from "../../models/ContasFinanceiro.js";

export function alerts(req, res) {
  ContasFinanceiro.findAll()
    .then((bills) => {
      const now = new Date();
      const alerts = bills
        .filter((b) => b.status !== "paid")
        .map((b) => {
          const due = b.due_date ? new Date(b.due_date) : null;
          let days_until_due = null;
          let urgency = "green";
          if (due) {
            days_until_due = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
            if (days_until_due <= 1) urgency = "red";
            else if (days_until_due <= 3) urgency = "yellow";
          }
          return {
            ...b.toJSON(),
            days_until_due,
            urgency,
          };
        });
      res.json(alerts);
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}
// Controller de relatórios financeiro
// Implemente a lógica real usando models do seu banco, aqui é mock igual backend-js
let bills = [
  {
    id: 1,
    name: "Conta de Luz",
    status: "pending",
    value: 100,
    amount: 100,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    category: "Moradia",
    city: "São Paulo",
    bill_type: "company",
  },
  {
    id: 2,
    name: "Conta de Água",
    status: "paid",
    value: 50,
    amount: 50,
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    category: "Moradia",
    city: "São Paulo",
    bill_type: "personal",
  },
];

export function dashboard(req, res) {
  const totalPaid = bills
    .filter((b) => b.status === "paid")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalOpen = bills
    .filter((b) => b.status !== "paid")
    .reduce((sum, b) => sum + (b.amount || 0), 0);
  const billsByCategory = [];
  ContasFinanceiro.findAll()
    .then((bills) => {
      const totalPaid = bills
        .filter((b) => b.status === "paid")
        .reduce((sum, b) => sum + Number(b.value), 0);
      const totalOpen = bills
        .filter((b) => b.status !== "paid")
        .reduce((sum, b) => sum + Number(b.value), 0);
      const billsByCategory = [];
      bills.forEach((b) => {
        if (b.status === "paid") {
          let cat = billsByCategory.find((c) => c.category === b.category);
          if (!cat) {
            cat = { category: b.category || "Sem categoria", total: 0 };
            billsByCategory.push(cat);
          }
          cat.total += Number(b.value);
        }
      });
      const billsByDateMap = {};
      bills.forEach((b) => {
        if (b.status === "paid") {
          const date = b.due_date || "Sem data";
          if (!billsByDateMap[date]) billsByDateMap[date] = 0;
          billsByDateMap[date] += 1;
        }
      });
      const billsByDate = Object.entries(billsByDateMap).map(
        ([date, count]) => ({ date, count }),
      );
      const now = new Date();
      const upcomingBills = bills.filter((b) => {
        if (!b.due_date) return false;
        const due = new Date(b.due_date);
        const diff = (due - now) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      }).length;
      const overdueBills = bills.filter((b) => {
        if (!b.due_date) return false;
        const due = new Date(b.due_date);
        return b.status !== "paid" && due < now;
      }).length;
      res.json({
        total_paid: totalPaid,
        total_open: totalOpen,
        totalBills: bills.length,
        bills_by_category: billsByCategory,
        bills_by_date: billsByDate,
        upcoming_bills: upcomingBills,
        overdue_bills: overdueBills,
      });
    })
    .catch((err) => res.status(500).json({ error: err.message }));
}

export function exportReport(req, res) {
  // Simples exportação mock
  res.json({ success: true, message: "Exportação mock realizada" });
}

// Compatibilidade com rota
export { exportReport as export };
