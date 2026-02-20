import React, { useState, useEffect } from 'react';
import { reportsAPI } from '../services/api';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await reportsAPI.getAlerts();
      setAlerts(data);
    } catch (error) {
      toast.error('Erro ao carregar avisos');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'red':
        return {
          color: 'bg-red-50 border-red-200',
          iconBg: 'bg-red-100',
          icon: AlertCircle,
          iconColor: 'text-red-600',
          badge: 'bg-red-500 text-white',
          label: 'Urgente'
        };
      case 'yellow':
        return {
          color: 'bg-yellow-50 border-yellow-200',
          iconBg: 'bg-yellow-100',
          icon: Clock,
          iconColor: 'text-yellow-600',
          badge: 'bg-yellow-500 text-white',
          label: 'Atenção'
        };
      case 'green':
        return {
          color: 'bg-green-50 border-green-200',
          iconBg: 'bg-green-100',
          icon: CheckCircle2,
          iconColor: 'text-green-600',
          badge: 'bg-green-500 text-white',
          label: 'No Prazo'
        };
      default:
        return {
          color: 'bg-gray-50 border-gray-200',
          iconBg: 'bg-gray-100',
          icon: Clock,
          iconColor: 'text-gray-600',
          badge: 'bg-gray-500 text-white',
          label: 'Normal'
        };
    }
  };

  const getDaysText = (days) => {
    if (days < 0) return `${Math.abs(days)} dia(s) atrasado`;
    if (days === 0) return 'Vence hoje';
    if (days === 1) return 'Vence amanhã';
    return `${days} dias para vencer`;
  };

  const redAlerts = alerts.filter(a => a.urgency === 'red');
  const yellowAlerts = alerts.filter(a => a.urgency === 'yellow');
  const greenAlerts = alerts.filter(a => a.urgency === 'green');

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
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2" data-testid="page-title">Avisos de Vencimento</h1>
            <p className="text-gray-600">Acompanhe as contas próximas ao vencimento</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500" data-testid="summary-red">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Urgente (≤1 dia)</p>
                  <p className="text-3xl font-bold text-red-600">{redAlerts.length}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="text-red-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500" data-testid="summary-yellow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Atenção (≤3 dias)</p>
                  <p className="text-3xl font-bold text-yellow-600">{yellowAlerts.length}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="text-yellow-600" size={28} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500" data-testid="summary-green">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">No Prazo (3 dias)</p>
                  <p className="text-3xl font-bold text-green-600">{greenAlerts.length}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={28} />
                </div>
              </div>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center border border-purple-100">
              <CheckCircle2 className="mx-auto text-green-500 mb-4" size={64} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Nenhuma conta em aberto!</h2>
              <p className="text-gray-600">Todas as suas contas estão em dia.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const config = getUrgencyConfig(alert.urgency);
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`bg-white rounded-xl shadow-md p-6 border-2 ${config.color} slide-in card-hover`}
                    data-testid={`alert-${alert.urgency}-${alert.id}`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${config.iconBg} flex-shrink-0`}>
                        <Icon className={config.iconColor} size={24} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{alert.account}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className="font-medium">{alert.category}</span>
                              <span>•</span>
                              <span>{alert.city}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.badge}`}>
                            {config.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-white/50 rounded-lg">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Vencimento</p>
                            <p className="font-semibold text-gray-800">
                              {new Date(alert.due_date).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Valor</p>
                            <p className="font-semibold text-gray-800">
                              R$ {(alert.value !== undefined && alert.value !== null && !isNaN(Number(alert.value)) && isFinite(Number(alert.value)))
                                ? Number(alert.value).toFixed(2)
                                : "--"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <p className={`font-semibold ${config.iconColor}`}>
                              {getDaysText(alert.days_until_due)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
