import ContasFinanceiro from "../../models/ContasFinanceiro.js";

/**
 * Helper function para verificar se conta está paga
 * Suporta status em inglês (paid) e português (Pago)
 */
const isPaid = (status) => {
  if (!status) return false;
  const normalizedStatus = status.trim().toLowerCase();
  return normalizedStatus === "paid" || normalizedStatus === "pago";
};

/**
 * Helper function para verificar se conta está pendente
 * Suporta status em inglês (pending) e português (Em Aberto)
 */
const isPending = (status) => {
  if (!status) return false;
  const normalizedStatus = status.trim().toLowerCase();
  return normalizedStatus === "pending" || normalizedStatus === "em aberto";
};

export function alerts(req, res) {
  ContasFinanceiro.findAll()
    .then((bills) => {
      const now = new Date();
      const alerts = bills
        .filter((b) => !isPaid(b.status))
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
      // Log para debug
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log('[Dashboard] Data atual:', today.toISOString().split('T')[0]);
      console.log('[Dashboard] Total de contas:', bills.length);
      
      // Mostrar contas com vencimento próximo
      const billsWithDueDate = bills.filter(b => b.due_date);
      console.log('[Dashboard] Contas com vencimento hoje (2026-03-06):', 
        billsWithDueDate.filter(b => b.due_date === '2026-03-06').map(b => ({
          id: b.id,
          name: b.name,
          status: b.status,
          value: b.value,
          due_date: b.due_date
        }))
      );
      
      const totalPaid = bills
        .filter((b) => isPaid(b.status))
        .reduce((sum, b) => sum + Number(b.value), 0);
      const totalOpen = bills
        .filter((b) => !isPaid(b.status))
        .reduce((sum, b) => sum + Number(b.value), 0);
      const billsByCategory = [];
      bills.forEach((b) => {
        if (isPaid(b.status)) {
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
        if (isPaid(b.status)) {
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
        return !isPaid(b.status) && due < now;
      }).length;
      
      // 🆕 NOVOS CAMPOS: Alertas de vencimento
      
      // Reutilizar variável 'today' já declarada anteriormente
      const todayTime = today.getTime();
      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const threeDaysTime = threeDaysFromNow.getTime();
      
      /**
       * LÓGICA DE CÁLCULO DOS ALERTAS:
       * 
       * 1. bills_due_today: Contas pendentes que vencem HOJE
       *    - Exemplo: Hoje=2026-03-06, vencimento=2026-03-06, status=pending ✅
       * 
       * 2. bills_due_3_days: Contas pendentes que vencem nos próximos 3 dias (incluindo hoje)
       *    - Exemplo: Hoje=2026-03-06, vencimento=2026-03-08, status=pending ✅
       * 
       * 3. bills_up_to_date: Contas pagas OU pendentes com vencimento > 3 dias
       *    - Exemplo 1: status=paid (qualquer vencimento) ✅
       *    - Exemplo 2: Hoje=2026-03-06, vencimento=2026-03-10, status=pending ✅
       * 
       * 🔴 NOTA: Contas atrasadas (vencimento < hoje) NÃO aparecem nestes campos,
       *          continuam sendo contabilizadas apenas em overdue_bills
       */
      
      // 1. Contas que vencem HOJE (status pending, data = hoje)
      const billsDueToday = bills.filter((b) => {
        if (!b.due_date || isPaid(b.status)) return false;
        const due = new Date(b.due_date);
        due.setHours(0, 0, 0, 0);
        const isToday = due.getTime() === todayTime;
        
        // Log para debug
        if (isToday) {
          console.log('[Dashboard] Conta vencendo HOJE:', {
            id: b.id,
            name: b.name,
            due_date: b.due_date,
            status: b.status,
            value: b.value,
            isPaid: isPaid(b.status),
            isPending: isPending(b.status)
          });
        }
        
        return isToday;
      });
      
      const bills_due_today = billsDueToday.length;
      const amount_due_today = billsDueToday.reduce(
        (sum, b) => sum + Number(b.value),
        0
      );
      
      // 2. Contas que vencem nos próximos 3 dias (incluindo hoje)
      const billsDue3Days = bills.filter((b) => {
        if (!b.due_date || isPaid(b.status)) return false;
        const due = new Date(b.due_date);
        due.setHours(0, 0, 0, 0);
        const dueTime = due.getTime();
        return dueTime >= todayTime && dueTime <= threeDaysTime;
      });
      
      const bills_due_3_days = billsDue3Days.length;
      const amount_due_3_days = billsDue3Days.reduce(
        (sum, b) => sum + Number(b.value),
        0
      );
      
      // 3. Contas em dia (pagas OU pendentes com vencimento > 3 dias)
      const billsUpToDate = bills.filter((b) => {
        // Contas pagas estão sempre em dia
        if (isPaid(b.status)) return true;
        
        // Contas pendentes: apenas se vencimento > 3 dias
        if (!b.due_date) return false;
        const due = new Date(b.due_date);
        due.setHours(0, 0, 0, 0);
        return due.getTime() > threeDaysTime;
      });
      
      const bills_up_to_date = billsUpToDate.length;
      const amount_up_to_date = billsUpToDate.reduce(
        (sum, b) => sum + Number(b.value),
        0
      );
      
      // Log resumo dos alertas
      console.log('[Dashboard] Resumo de alertas:', {
        bills_due_today,
        amount_due_today,
        bills_due_3_days,
        amount_due_3_days,
        bills_up_to_date,
        amount_up_to_date
      });
      
      res.json({
        total_paid: totalPaid,
        total_open: totalOpen,
        totalBills: bills.length,
        bills_by_category: billsByCategory,
        bills_by_date: billsByDate,
        upcoming_bills: upcomingBills,
        overdue_bills: overdueBills,
        // 🆕 Novos campos para alertas de vencimento
        bills_due_today: bills_due_today,
        amount_due_today: amount_due_today,
        bills_due_3_days: bills_due_3_days,
        amount_due_3_days: amount_due_3_days,
        bills_up_to_date: bills_up_to_date,
        amount_up_to_date: amount_up_to_date,
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
