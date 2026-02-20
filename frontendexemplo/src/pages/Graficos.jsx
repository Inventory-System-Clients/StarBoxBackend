import { useState, useEffect, useCallback, useMemo } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { PageHeader } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
} from "recharts";

export function Graficos() {
  const [loading, setLoading] = useState(true);
  const [lojas, setLojas] = useState([]);
  const [lojaSelecionada, setLojaSelecionada] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [dadosDashboard, setDadosDashboard] = useState(null);
  const [erro, setErro] = useState("");

  // Lucro total já vem do backend (não somar dinheiro/pix)
  const lucroTotal = useMemo(() => {
    if (!dadosDashboard?.totais) return 0;
    return dadosDashboard.totais.lucro || 0;
  }, [dadosDashboard]);

  // Configuração inicial de datas (últimos 30 dias)
  useEffect(() => {
    carregarLojas();
    const hoje = new Date();
    const trintaDiasAtras = new Date();
    trintaDiasAtras.setDate(hoje.getDate() - 30);
    setDataFim(hoje.toISOString().split("T")[0]);
    setDataInicio(trintaDiasAtras.toISOString().split("T")[0]);
  }, []);

  // Busca de Lojas para o Dropdown
  const carregarLojas = async () => {
    try {
      const response = await api.get("/lojas");
      setLojas(response.data || []);
      if (response.data && response.data.length > 0) {
        setLojaSelecionada(response.data[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar lojas:", error);
      setErro("Erro ao carregar lista de lojas.");
    }
  };

  // Nova função otimizada: busca dados já processados do Backend
  const carregarDados = useCallback(async () => {
    if (!lojaSelecionada || !dataInicio || !dataFim) return;

    setErro("");
    setLoading(true);

    try {
      // O Backend agora faz todo o trabalho pesado via SQL
      const response = await api.get("/relatorios/dashboard", {
        params: {
          lojaId: lojaSelecionada,
          dataInicio,
          dataFim,
        },
      });

      setDadosDashboard(response.data);
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
      setErro("Não foi possível carregar os dados do painel.");
      setDadosDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [lojaSelecionada, dataInicio, dataFim]);

  // Atualiza quando filtros mudam
  useEffect(() => {
    if (lojaSelecionada && dataInicio && dataFim) {
      if (new Date(dataInicio) > new Date(dataFim)) {
        setErro("A data inicial não pode ser maior que a data final.");
        return;
      }
      carregarDados();
    }
  }, [lojaSelecionada, dataInicio, dataFim, carregarDados]);

  // Formatação de Moeda
  const formatMoney = (val) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);

  // Calcula a margem de lucro para exibição (caso o backend não envie explicito)
  const calcularMargem = (lucro, faturamento) => {
    if (!faturamento || faturamento === 0) return 0;
    return ((lucro / faturamento) * 100).toFixed(1);
  };

  if (loading && !dadosDashboard) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gray-50 bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Painel de Controle e Gráficos"
          subtitle="Visão estratégica do seu negócio"
          icon="📊"
        />

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-8 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Loja
              </label>
              <select
                value={lojaSelecionada}
                onChange={(e) => setLojaSelecionada(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              >
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>
          </div>
        </div>

        {erro && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
            <p className="font-bold">Atenção</p>
            <p>{erro}</p>
          </div>
        )}

        {dadosDashboard && (
          <div className="space-y-8 animate-fade-in">
            {/* 1. KPI Cards - Indicadores Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              {/* Faturamento */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Faturamento
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {formatMoney(dadosDashboard.totais.faturamento)}
                    </h3>
                  </div>
                  <span className="p-2 bg-green-100 text-green-600 rounded-lg text-xl">
                    💰
                  </span>
                </div>
              </div>

              {/* Dinheiro */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Dinheiro
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {formatMoney(dadosDashboard?.totais?.dinheiro || 0)}
                    </h3>
                  </div>
                  <span className="p-2 bg-yellow-100 text-yellow-600 rounded-lg text-xl">
                    💵
                  </span>
                </div>
              </div>

              {/* Pix */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-cyan-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Pix
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {formatMoney(dadosDashboard?.totais?.pix || 0)}
                    </h3>
                  </div>
                  <span className="p-2 bg-cyan-100 text-cyan-600 rounded-lg text-xl">
                    🟢
                  </span>
                </div>
              </div>

              {/* Lucro Estimado */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Lucro Estimado
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {formatMoney(lucroTotal)}
                    </h3>
                  </div>
                  <span className="p-2 bg-blue-100 text-blue-600 rounded-lg text-xl">
                    📈
                  </span>
                </div>
                <div className="mt-3 flex items-center">
                  <span className="text-sm font-semibold text-green-600">
                    {dadosDashboard?.totais?.faturamento
                      ? calcularMargem(
                          lucroTotal,
                          dadosDashboard.totais.faturamento,
                        )
                      : "0.0"}
                    %
                  </span>
                  <span className="text-xs text-gray-500 ml-1">Margem</span>
                </div>
              </div>

              {/* Prêmios Entregues */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Prêmios Entregues
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {dadosDashboard.totais.saidas}
                    </h3>
                  </div>
                  <span className="p-2 bg-orange-100 text-orange-600 rounded-lg text-xl">
                    🧸
                  </span>
                </div>
              </div>

              {/* Eficiência (Fichas Totais) */}
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Total Fichas
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {dadosDashboard.totais.fichas}
                    </h3>
                  </div>
                  <span className="p-2 bg-purple-100 text-purple-600 rounded-lg text-xl">
                    🎫
                  </span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Média:{" "}
                  {dadosDashboard?.totais?.saidas > 0
                    ? (
                        dadosDashboard.totais.fichas /
                        dadosDashboard.totais.saidas
                      ).toFixed(1)
                    : "0.0"}{" "}
                  fichas/prêmio
                </div>
              </div>
            </div>

            {/* 2. Gráfico de Evolução Financeira */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                  <span className="bg-gray-100 p-1 rounded mr-2">📅</span>
                  Evolução Diária
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosDashboard.graficoFinanceiro}>
                      <defs>
                        <linearGradient
                          id="colorFat"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10B981"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10B981"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="data"
                        tickFormatter={(str) =>
                          new Date(str).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          })
                        }
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                        labelFormatter={(label) =>
                          new Date(label).toLocaleDateString("pt-BR")
                        }
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="faturamento"
                        name="Faturamento"
                        stroke="#10B981"
                        fillOpacity={1}
                        fill="url(#colorFat)"
                      />
                      {/* Opcional: Se quiser mostrar Custo também */}
                      <Area
                        type="monotone"
                        dataKey="custo"
                        name="Custo"
                        stroke="#EF4444"
                        fillOpacity={0.1}
                        fill="#EF4444"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 3. Performance por Máquina */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                  <span className="bg-gray-100 p-1 rounded mr-2">🤖</span>
                  Performance por Máquina
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosDashboard.performanceMaquinas}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: "transparent" }}
                        formatter={(value, name) => [
                          name === "faturamento"
                            ? formatMoney(value)
                            : `${value}%`,
                          name === "faturamento" ? "Faturamento" : "Ocupação",
                        ]}
                      />
                      <Legend />
                      <Bar
                        dataKey="faturamento"
                        name="Faturamento"
                        fill="#3B82F6"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4. Ranking de Produtos e Ocupação */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Produtos */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <span className="bg-gray-100 p-1 rounded mr-2">🏆</span>
                  Top Produtos Vendidos
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Produto
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Qtd
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Popularidade
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dadosDashboard.rankingProdutos.map((prod, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {idx + 1}. {prod.nome}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right">
                            {prod.quantidade}
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    (prod.quantidade /
                                      (dadosDashboard.rankingProdutos[0]
                                        .quantidade || 1)) *
                                      100,
                                    100,
                                  )}%`,
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status de Ocupação (Estoque) */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                  <span className="bg-gray-100 p-1 rounded mr-2">📦</span>
                  Nível de Estoque (%)
                </h3>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dadosDashboard.performanceMaquinas}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="nome"
                        tick={{ fontSize: 10 }}
                        interval={0}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(val) => `${val}%`} />
                      <Bar
                        dataKey="ocupacao"
                        name="Ocupação"
                        radius={[4, 4, 0, 0]}
                      >
                        {dadosDashboard.performanceMaquinas.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                entry.ocupacao < 30
                                  ? "#EF4444" // Crítico
                                  : entry.ocupacao < 60
                                    ? "#F59E0B" // Atenção
                                    : "#10B981" // Bom
                              }
                            />
                          ),
                        )}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
