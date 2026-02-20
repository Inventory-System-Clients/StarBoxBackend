import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { reportsAPI } from '../services/api.js';
import { Button } from '../components/ui/button.jsx';
import { Plus, TrendingUp, TrendingDown, AlertTriangle, Calendar, Download } from 'lucide-react';
import BillModal from '../components/BillModal.jsx';
import { categoriesAPI } from '../services/api.js';
import { toast } from 'sonner';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [reportData, alertsData, categoriesData] = await Promise.all([
        reportsAPI.getDashboard(),
        reportsAPI.getAlerts(),
        categoriesAPI.getAll()
      ]);
      setReport(reportData);
      setAlerts(alertsData);
      setCategories(categoriesData);
    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const blob = await reportsAPI.export(format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_contas.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Relatório ${format.toUpperCase()} exportado com sucesso!`);
    } catch (error) {
      toast.error('Erro ao exportar relatório');
    }
  };

  const urgentAlerts = alerts.filter(a => a.urgency === 'red' || a.urgency === 'yellow');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col app-container">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2" data-testid="page-title">Dashboard</h1>
              <p className="text-gray-600">Visão geral das contas a pagar</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={() => navigate('/financeiro/contas/personal')} variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">Contas Particulares</Button>
                <Button onClick={() => navigate('/financeiro/contas/company')} variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50">Contas Empresariais</Button>
                <Button onClick={() => navigate('/financeiro/avisos')} variant="outline" className="border-yellow-300 text-yellow-600 hover:bg-yellow-50">Avisos</Button>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg btn-primary"
                data-testid="btn-add-bill"
              >
                <Plus size={20} className="mr-2" />
                Cadastrar Conta
              </Button>
              <Button
                onClick={() => handleExport('pdf')}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50"
                data-testid="btn-export-pdf"
              >
                <Download size={18} className="mr-2" />
                PDF
              </Button>
              <Button
                onClick={() => handleExport('excel')}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
                data-testid="btn-export-excel"
              >
                <Download size={18} className="mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {urgentAlerts.length > 0 && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg slide-in" data-testid="urgent-alerts-banner">
              <div className="flex items-center">
                <AlertTriangle className="text-yellow-600 mr-3" size={24} />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Atenção! Você tem {urgentAlerts.length} conta(s) próxima(s) ao vencimento
                  </p>
                  <button
                    onClick={() => navigate('/financeiro/avisos')}
                    className="text-sm text-yellow-700 underline hover:text-yellow-900"
                    data-testid="link-view-alerts"
                  >
                    Ver todos os avisos
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100 card-hover" data-testid="card-total-paid">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total Pago</h3>
              <p className="text-3xl font-bold text-gray-800">R$ {report?.total_paid.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100 card-hover" data-testid="card-total-open">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <TrendingDown className="text-red-600" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total em Aberto</h3>
              <p className="text-3xl font-bold text-gray-800">R$ {report?.total_open.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100 card-hover" data-testid="card-upcoming">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Calendar className="text-yellow-600" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Próximos 7 Dias</h3>
              <p className="text-3xl font-bold text-gray-800">{report?.upcoming_bills}</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100 card-hover" data-testid="card-overdue">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <AlertTriangle className="text-purple-600" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Atrasadas</h3>
              <p className="text-3xl font-bold text-gray-800">{report?.overdue_bills}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100" data-testid="section-by-category">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Valor Pago por Categoria</h2>
              <div className="space-y-3">
                {report?.bills_by_category.length > 0 ? (
                  report.bills_by_category.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium text-gray-700">{item.category}</span>
                      <span className="text-purple-600 font-semibold">R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhum pagamento realizado ainda</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100" data-testid="section-by-date">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Datas com Mais Pagamentos</h2>
              <div className="space-y-3">
                {report?.bills_by_date.length > 0 ? (
                  report.bills_by_date.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium text-gray-700">
                        {new Date(item.date).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-blue-600 font-semibold">{item.count} pagamento(s)</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Nenhum pagamento realizado ainda</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {showModal && (
        <BillModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchData();
            setShowModal(false);
          }}
          categories={categories}
        />
      )}
    </div>
  );
}
