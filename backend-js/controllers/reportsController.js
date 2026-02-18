// Reports controller
const { bills } = require('../models/bill');

exports.dashboard = (req, res) => {
  const totalPaid = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalOpen = bills.filter(b => b.status !== 'paid').reduce((sum, b) => sum + (b.amount || 0), 0);
  const billsByCategory = [];
  bills.forEach(b => {
    if (b.status === 'paid') {
      let cat = billsByCategory.find(c => c.category === b.category);
      if (!cat) {
        cat = { category: b.category || 'Sem categoria', total: 0 };
        billsByCategory.push(cat);
      }
      cat.total += b.amount || 0;
    }
  });
  const billsByDateMap = {};
  bills.forEach(b => {
    if (b.status === 'paid') {
      const date = b.due_date || 'Sem data';
      if (!billsByDateMap[date]) billsByDateMap[date] = 0;
      billsByDateMap[date] += 1;
    }
  });
  const billsByDate = Object.entries(billsByDateMap).map(([date, count]) => ({ date, count }));
  const now = new Date();
  const upcomingBills = bills.filter(b => {
    if (!b.due_date) return false;
    const due = new Date(b.due_date);
    const diff = (due - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;
  const overdueBills = bills.filter(b => {
    if (!b.due_date) return false;
    const due = new Date(b.due_date);
    return b.status !== 'paid' && due < now;
  }).length;
  res.json({
    total_paid: totalPaid,
    total_open: totalOpen,
    totalBills: bills.length,
    bills_by_category: billsByCategory,
    bills_by_date: billsByDate,
    upcoming_bills: upcomingBills,
    overdue_bills: overdueBills
  });
};

exports.alerts = (req, res) => {
  const now = new Date();
  const alerts = bills
    .filter(b => b.status !== 'paid')
    .map(b => {
      const due = b.due_date ? new Date(b.due_date) : null;
      let days_until_due = null;
      let urgency = 'green';
      if (due) {
        days_until_due = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        if (days_until_due <= 1) urgency = 'red';
        else if (days_until_due <= 3) urgency = 'yellow';
      }
      return {
        id: b.id,
        account: b.name,
        category: b.category,
        city: b.city,
        urgency,
        days_until_due,
        due_date: b.due_date,
        amount: b.amount,
        status: b.status
      };
    });
  res.json(alerts);
};

exports.export = (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  res.send('PDF FAKE');
};
