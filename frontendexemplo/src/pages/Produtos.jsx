import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "../contexts/AuthContext.jsx";

export function Produtos() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [produtoParaDeletar, setProdutoParaDeletar] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [mostrarInativos, setMostrarInativos] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, [mostrarInativos]); // Recarrega quando o filtro muda

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const urlProdutos = mostrarInativos
        ? "/produtos?incluirInativos=true"
        : "/produtos";
      const response = await api.get(urlProdutos);
      setProdutos(response.data);
    } catch (error) {
      setError(
        "Erro ao carregar produtos: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/produtos/${deleteId}`);

      // Verificar se foi soft delete ou hard delete
      if (response.data.permanentDelete) {
        setSuccess("✅ Produto excluído permanentemente com sucesso!");
      } else {
        setSuccess(
          "⚠️ Produto desativado! Clique novamente em excluir para deletar permanentemente.",
        );
      }

      carregarProdutos();
      setDeleteId(null);
      setProdutoParaDeletar(null);
    } catch (error) {
      setError(
        "Erro ao excluir produto: " +
          (error.response?.data?.error || error.message),
      );
      setDeleteId(null);
      setProdutoParaDeletar(null);
    }
  };

  const handleAbrirDialogDeletar = (produto) => {
    setDeleteId(produto.id);
    setProdutoParaDeletar(produto);
  };

  const categorias = [
    ...new Set(produtos.map((p) => p.categoria).filter(Boolean)),
  ];
  const produtosFiltrados = filtroCategoria
    ? produtos.filter((p) => p.categoria === filtroCategoria)
    : produtos;

  const stats = [
    {
      label: "Total de Produtos",
      value: produtos.length,
      icon: "🧸",
      gradient: "bg-gradient-to-br from-pink-500 to-pink-600",
    },
    {
      label: "Produtos Ativos",
      value: produtos.filter((p) => p.ativo).length,
      icon: "✅",
      gradient: "bg-gradient-to-br from-green-500 to-green-600",
    },
    {
      label: "Categorias",
      value: categorias.length,
      icon: "📁",
      gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
    },
    {
      label: "Valor Médio",
      value:
        produtos.length > 0
          ? `R$ ${(
              produtos.reduce((sum, p) => sum + Number(p.preco || 0), 0) /
              produtos.length
            ).toFixed(2)}`
          : "R$ 0,00",
      icon: "💰",
      gradient: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    },
  ];

  const columns = [
    {
      key: "imagem",
      label: "",
      render: (produto) => (
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
          {produto.emoji || "🧸"}
        </div>
      ),
    },
    { key: "codigo", label: "Código" },
    { key: "nome", label: "Nome" },
    { key: "categoria", label: "Categoria" },
    {
      key: "preco",
      label: "Preço",
      render: (produto) => (
        <span className="font-semibold text-green-600">
          R$ {Number(produto.preco || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "jogadas_2_50",
      label: "💰 Jogadas R$ 2,50",
      render: (produto) => {
        const preco = Number(produto.preco || 0);
        const jogadas = Math.ceil(preco / 2.5);
        return (
          <div className="text-center">
            <span className="font-bold text-green-600 text-lg">{jogadas}</span>
            <span className="text-xs text-gray-500 block">
              {jogadas === 1 ? "jogada" : "jogadas"}
            </span>
          </div>
        );
      },
    },
    {
      key: "jogadas_5_00",
      label: "💎 Jogadas R$ 5,00",
      render: (produto) => {
        const preco = Number(produto.preco || 0);
        const jogadas = Math.ceil(preco / 5);
        return (
          <div className="text-center">
            <span className="font-bold text-blue-600 text-lg">{jogadas}</span>
            <span className="text-xs text-gray-500 block">
              {jogadas === 1 ? "jogada" : "jogadas"}
            </span>
          </div>
        );
      },
    },
    {
      key: "estoque",
      label: "Estoque",
      render: (produto) => {
        const estoque = produto.estoqueAtual || 0;
        const cor =
          estoque < 10 ? "error" : estoque < 30 ? "warning" : "success";
        return <Badge type={cor}>{estoque}</Badge>;
      },
    },
    {
      key: "ativo",
      label: "Status",
      render: (produto) => (
        <Badge variant={produto.ativo ? "success" : "danger"}>
          {produto.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "acoes",
      label: "Ações",
      render: (produto) => (
        <div className="flex gap-2">
          {usuario?.role === "ADMIN" && (
            <>
              <button
                onClick={() => navigate(`/produtos/${produto.id}/editar`)}
                className="text-blue-600 hover:text-blue-800 font-semibold"
                title="Editar"
              >
                ✏️
              </button>
              <button
                onClick={() => handleAbrirDialogDeletar(produto)}
                className="text-red-600 hover:text-red-800 font-semibold"
                title="Excluir"
              >
                {produto.ativo ? "⚠️" : "🗑️"}
              </button>
            </>
          )}
          {usuario?.role !== "ADMIN" && (
            <span className="text-gray-400 text-sm">Somente visualização</span>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#62A1D9] via-[#A6806A] to-[#24094E] text-[#24094E]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Produtos"
          subtitle="Gerencie os produtos (pelúcias) disponíveis no sistema"
          icon="🧸"
          action={
            usuario?.role === "ADMIN"
              ? {
                  label: "Novo Produto",
                  onClick: () => navigate("/produtos/novo"),
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
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            {categorias.length > 0 && (
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtrar por Categoria
                </label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="select-field w-full"
                >
                  <option value="">Todas as Categorias</option>
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={mostrarInativos}
                  onChange={(e) => setMostrarInativos(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-gray-700">
                  Mostrar produtos inativos
                </span>
              </label>
            </div>
          </div>

          {produtosFiltrados.length > 0 ? (
            <DataTable headers={columns} data={produtosFiltrados} />
          ) : (
            <EmptyState
              icon="🧸"
              title="Nenhum produto encontrado"
              message={
                filtroCategoria
                  ? "Não há produtos cadastrados nesta categoria. Experimente selecionar outra categoria."
                  : "Cadastre seu primeiro produto para começar!"
              }
              action={{
                label: "Novo Produto",
                onClick: () => navigate("/produtos/novo"),
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
          setProdutoParaDeletar(null);
        }}
        onConfirm={handleDelete}
        title={
          produtoParaDeletar?.ativo
            ? "Desativar Produto"
            : "Excluir Produto Permanentemente"
        }
        message={
          produtoParaDeletar?.ativo
            ? `Tem certeza que deseja desativar o produto "${produtoParaDeletar?.nome}"? O produto ficará inativo mas não será excluído. Para excluir permanentemente, clique em excluir novamente após desativar.`
            : `⚠️ ATENÇÃO: Esta ação irá EXCLUIR PERMANENTEMENTE o produto "${produtoParaDeletar?.nome}" do sistema. Esta ação NÃO PODE SER DESFEITA!`
        }
      />
    </div>
  );
}
