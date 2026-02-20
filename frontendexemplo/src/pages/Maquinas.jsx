import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import {
  PageHeader,
  StatsGrid,
  DataTable,
  Badge,
  ConfirmDialog,
  AlertBox,
} from "../components/UIComponents";
import { PageLoader, EmptyState } from "../components/Loading";

export function Maquinas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [maquinas, setMaquinas] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [maquinaParaDeletar, setMaquinaParaDeletar] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filtroLoja, setFiltroLoja] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [mostrarInativas]); // Recarrega quando o filtro muda

  const carregarDados = async () => {
    try {
      setLoading(true);
      const urlMaquinas = mostrarInativas
        ? "/maquinas?incluirInativas=true"
        : "/maquinas";

      const [maquinasRes, lojasRes] = await Promise.all([
        api.get(urlMaquinas),
        api.get("/lojas"),
      ]);
      console.log("Máquinas recebidas:", maquinasRes.data);
      console.log("Lojas recebidas:", lojasRes.data);
      setMaquinas(maquinasRes.data);
      setLojas(lojasRes.data);
    } catch (error) {
      setError(
        "Erro ao carregar dados: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/maquinas/${deleteId}`);

      // Verificar se foi soft delete ou hard delete
      if (response.data.permanentDelete) {
        setSuccess("✅ Máquina excluída permanentemente com sucesso!");
      } else {
        setSuccess(
          "⚠️ Máquina desativada! Clique novamente em excluir para deletar permanentemente."
        );
      }

      carregarDados();
      setDeleteId(null);
      setMaquinaParaDeletar(null);
    } catch (error) {
      setError(
        "Erro ao excluir máquina: " +
          (error.response?.data?.error || error.message)
      );
      setDeleteId(null);
      setMaquinaParaDeletar(null);
    }
  };

  const handleAbrirDialogDeletar = (maquina) => {
    setDeleteId(maquina.id);
    setMaquinaParaDeletar(maquina);
  };

  // Filtro por loja (backend já filtra por ativo/inativo)
  const maquinasFiltradas = filtroLoja
    ? maquinas.filter((m) => m.lojaId === filtroLoja)
    : maquinas;

  const stats = [
    {
      label: "Total de Máquinas",
      value: maquinas.length,
      icon: "🎰",
      gradient: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
    {
      label: "Máquinas Ativas",
      value: maquinas.filter((m) => m.ativo).length,
      icon: "✅",
      gradient: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      label: "Capacidade Total",
      value: maquinas.reduce((sum, m) => sum + (m.capacidadePadrao || 0), 0),
      icon: "📦",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      label: "Valor Médio Ficha",
      value:
        maquinas.length > 0
          ? `R$ ${(
              maquinas.reduce((sum, m) => sum + (m.valorFicha || 0), 0) /
              maquinas.length
            ).toFixed(2)}`
          : "R$ 0,00",
      icon: "💰",
      gradient: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    },
  ];

  const columns = [
    {
      key: "codigo",
      label: "Código",
      render: (maquina) => maquina.codigo || "-",
    },
    {
      key: "nome",
      label: "Nome",
      render: (maquina) => maquina.nome || "-",
    },
    {
      key: "loja",
      label: "Loja",
      render: (maquina) => {
        console.log("Buscando loja para máquina:", maquina.lojaId, "em", lojas);
        const loja = lojas.find((l) => l.id === maquina.lojaId);
        return loja ? loja.nome : `N/A (ID: ${maquina.lojaId})`;
      },
    },
    {
      key: "tipo",
      label: "Tipo",
      render: (maquina) => maquina.tipo || "-",
    },
    {
      key: "capacidadePadrao",
      label: "Capacidade",
      render: (maquina) => maquina.capacidadePadrao || 0,
    },
    {
      key: "valorFicha",
      label: "Valor Ficha",
      render: (maquina) => {
        const valor = parseFloat(maquina.valorFicha);
        return !isNaN(valor) && valor > 0 ? `R$ ${valor.toFixed(2)}` : "-";
      },
    },
    {
      key: "ativo",
      label: "Status",
      render: (maquina) => (
        <Badge variant={maquina.ativo ? "success" : "danger"}>
          {maquina.ativo ? "Ativa" : "Inativa"}
        </Badge>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      render: (maquina) => (
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/maquinas/${maquina.id}/editar`)}
            className="text-blue-600 hover:text-blue-800 font-semibold"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={() => handleAbrirDialogDeletar(maquina)}
            className={`font-semibold ${
              maquina.ativo
                ? "text-orange-600 hover:text-orange-800"
                : "text-red-600 hover:text-red-800"
            }`}
            title={maquina.ativo ? "Desativar" : "Excluir Permanentemente"}
          >
            {maquina.ativo ? "⚠️" : "🗑️"}
          </button>
        </div>
      ),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Máquinas"
          subtitle="Gerencie as máquinas de pelúcia das lojas"
          icon="🎰"
          action={
            usuario?.role === "ADMIN"
              ? {
                  label: "Nova Máquina",
                  onClick: () => navigate("/maquinas/nova"),
                }
              : undefined
          }
        />

        {error && (
          <AlertBox type="error" message={error} onClose={() => setError("")} />
        )}
        {success && (
          <AlertBox
            type="success"
            message={success}
            onClose={() => setSuccess("")}
          />
        )}

        <StatsGrid stats={stats} />

        <div className="card-gradient">
          {/* Filtros */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filtrar por Loja
              </label>
              <select
                value={filtroLoja}
                onChange={(e) => setFiltroLoja(e.target.value)}
                className="select-field"
              >
                <option value="">Todas as Lojas</option>
                {lojas.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mostrarInativas}
                  onChange={(e) => setMostrarInativas(e.target.checked)}
                  className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-semibold text-gray-700">
                  Mostrar máquinas inativas
                </span>
              </label>
            </div>
          </div>

          {maquinasFiltradas.length > 0 ? (
            <DataTable headers={columns} data={maquinasFiltradas} />
          ) : (
            <EmptyState
              icon="🎰"
              title="Nenhuma máquina encontrada"
              message={
                filtroLoja
                  ? "Não há máquinas cadastradas nesta loja. Experimente selecionar outra loja."
                  : "Cadastre sua primeira máquina para começar!"
              }
              action={{
                label: "Nova Máquina",
                onClick: () => navigate("/maquinas/nova"),
              }}
            />
          )}
        </div>
      </div>

      <Footer />

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => {
          setDeleteId(null);
          setMaquinaParaDeletar(null);
        }}
        onConfirm={handleDelete}
        title={
          maquinaParaDeletar?.ativo
            ? "Desativar Máquina"
            : "Excluir Permanentemente"
        }
        message={
          maquinaParaDeletar?.ativo
            ? "🛡️ A máquina será DESATIVADA e não aparecerá mais nas listagens ativas. Os dados serão preservados e você poderá reativá-la editando-a. Para excluir permanentemente, clique em excluir novamente."
            : "⚠️ ATENÇÃO: Esta ação é PERMANENTE e IRREVERSÍVEL! A máquina e todo seu histórico serão deletados do banco de dados. Tem certeza absoluta?"
        }
      />
    </div>
  );
}
