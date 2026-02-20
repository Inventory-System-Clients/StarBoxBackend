
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import DashboardPage from "./DashboardPageFinanceiro.jsx";
import BillsPage from "./BillsPage.jsx";
import AlertsPage from "./AlertsPage.jsx";

function FinanceiroRoutes() {
  return (
    <Routes>
      <Route path="" element={<DashboardPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="contas/:type" element={<BillsPage />} />
      <Route path="avisos" element={<AlertsPage />} />
      {/* <Route path="*" element={<Navigate to="/financeiro" />} /> */}
    </Routes>
  );
}

export default FinanceiroRoutes;

