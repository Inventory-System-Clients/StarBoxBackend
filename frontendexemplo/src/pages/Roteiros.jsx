import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

export function Roteiros() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  // --- ESTADOS DE DADOS ---
  const [roteiros, setRoteiros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [todasLojas, setTodasLojas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --- ESTADOS DE MODAL ---
  const [showModalCriarRoteiro, setShowModalCriarRoteiro] = useState(false);
  const [showModalAdicionarLoja, setShowModalAdicionarLoja] = useState(false);
  const [novoNomeRoteiro, setNovoNomeRoteiro] = useState("");
  const [roteiroParaAdicionar, setRoteiroParaAdicionar] = useState(null);

  // --- ESTADOS DE DRAG & DROP ---
  const [draggedLoja, setDraggedLoja] = useState(null);
  const [draggedFromRoteiro, setDraggedFromRoteiro] = useState(null);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      setLoading(true);
      const [resRoteiros, resFuncionarios, resLojas] = await Promise.all([
        api.get("/roteiros"),
        api.get("/usuarios/funcionarios"),
        api.get("/lojas"),
      ]);
      setRoteiros(resRoteiros.data || []);
      setFuncionarios(resFuncionarios.data || []);
      setTodasLojas(resLojas.data || []);
    } catch (err) {
      setError("Erro ao carregar dados dos roteiros.");
    } finally {
      setLoading(false);
    }
  };

  // --- AÇÕES ---
  const handleCriarRoteiro = async () => {
    try {
      await api.post("/roteiros", { nome: novoNomeRoteiro });
      setNovoNomeRoteiro("");
      setShowModalCriarRoteiro(false);
      setSuccess("Roteiro criado com sucesso!");
      carregarDadosIniciais();
    } catch (err) {
      setError("Erro ao criar roteiro.");
    }
  };

  const handleMoverLoja = async (lojaId, origemId, destinoId) => {
    try {
      await api.post("/roteiros/mover-loja", {
        lojaId,
        roteiroOrigemId: origemId,
        roteiroDestinoId: destinoId,
      });
      carregarDadosIniciais();
    } catch (err) {
      setError("Erro ao mover loja.");
    }
  };

  // --- DRAG AND DROP HANDLERS ---
  const onDragStart = (loja, roteiroId) => {
    if (usuario?.role !== "ADMIN") return;
    setDraggedLoja(loja);
    setDraggedFromRoteiro(roteiroId);
  };

  const onDrop = (e, roteiroDestinoId) => {
    e.preventDefault();
    if (!draggedLoja || draggedFromRoteiro === roteiroDestinoId) return;
    handleMoverLoja(draggedLoja.id, draggedFromRoteiro, roteiroDestinoId);
    setDraggedLoja(null);
    setDraggedFromRoteiro(null);
  };

  if (loading)
    return (
      <div className="p-20 text-center font-bold">Carregando roteiros...</div>
    );

  return (
    <div className="min-h-screen bg-gray-100 text-[#24094E]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">🗺️ Gestão de Roteiros</h1>
          {usuario?.role === "ADMIN" && (
            <button
              onClick={() => setShowModalCriarRoteiro(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-shadow shadow-md"
            >
              + Novo Roteiro
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded shadow-sm">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roteiros.map((roteiro) => (
            <div
              key={roteiro.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, roteiro.id)}
              className={`rounded-xl shadow-lg p-6 border-2 transition-all 
                ${roteiro.status === "finalizado" ? "bg-green-50 border-green-600" : "bg-white border-transparent"}
                ${draggedLoja && draggedFromRoteiro !== roteiro.id ? "border-blue-400 border-dashed bg-blue-50" : ""}
              `}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-extrabold flex items-center gap-2">
                  {roteiro.nome}
                  {roteiro.status === "finalizado" && (
                    <span className="ml-2 px-2 py-1 rounded-full bg-green-200 text-green-800 text-xs font-bold uppercase">Finalizado</span>
                  )}
                </h2>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${roteiro.funcionarioId ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}
                >
                  {roteiro.funcionarioId ? "Ativo" : "Pendente"}
                </span>
              </div>

              {/* Seção de Funcionário */}
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-400 block mb-1">
                  RESPONSÁVEL
                </label>
                {usuario?.role === "ADMIN" ? (
                  <select
                    className="w-full p-2 text-sm border rounded bg-gray-50"
                    value={roteiro.funcionarioId || ""}
                    onChange={async (e) => {
                      const id = e.target.value;
                      const f = funcionarios.find((x) => x.id === id);
                      await api.post(`/roteiros/${roteiro.id}/iniciar`, {
                        funcionarioId: id,
                        funcionarioNome: f?.nome || "",
                      });
                      carregarDadosIniciais();
                    }}
                  >
                    <option value="">Selecione um funcionário</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm font-medium">
                    {roteiro.funcionarioNome || "Não atribuído"}
                  </p>
                )}
              </div>

              {/* Lista de Lojas */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400">
                    LOJAS NO DIA
                  </span>
                  {usuario?.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        setRoteiroParaAdicionar(roteiro);
                        setShowModalAdicionarLoja(true);
                      }}
                      className="text-blue-600 text-xs font-bold hover:underline"
                    >
                      + Adicionar
                    </button>
                  )}
                </div>
                <div className="min-h-[120px] bg-gray-50 rounded-lg p-3 border border-gray-100">
                  {roteiro.lojas?.length > 0 ? (
                    roteiro.lojas.map((loja) => (
                      <div
                        key={loja.id}
                        draggable={usuario?.role === "ADMIN"}
                        onDragStart={() => onDragStart(loja, roteiro.id)}
                        className="bg-white p-3 rounded-md border border-gray-200 shadow-sm mb-2 text-sm flex items-center gap-2 cursor-move hover:border-blue-300 transition-colors"
                      >
                        <span className="text-gray-400">☰</span> 🏪 {loja.nome}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 opacity-30">
                      <span className="text-2xl">📦</span>
                      <p className="text-[10px] font-bold">VAZIO</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões de Ação com lógica dinâmica */}
              <div className="flex gap-2 mt-auto">
                {!roteiro.status || roteiro.status === "pendente" ? (
                  <button
                    onClick={() => navigate(`/roteiros/${roteiro.id}/executar`)}
                    className="flex-1 bg-[#24094E] text-white py-2 rounded-lg font-bold text-sm hover:bg-black transition-colors"
                  >
                    {roteiro.funcionarioId ? "Continuar" : "Começar Rota"}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL CRIAR ROTEIRO */}
      {showModalCriarRoteiro && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Criar Novo Roteiro</h2>
            <input
              autoFocus
              className="w-full p-3 border rounded-xl mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Roteiro Norte - Seg"
              value={novoNomeRoteiro}
              onChange={(e) => setNovoNomeRoteiro(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowModalCriarRoteiro(false)}
                className="flex-1 py-3 text-gray-500 font-bold"
              >
                Voltar
              </button>
              <button
                onClick={handleCriarRoteiro}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR LOJA (Simplificado) */}
      {showModalAdicionarLoja && roteiroParaAdicionar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-bold mb-4">
              Adicionar Loja a {roteiroParaAdicionar.nome}
            </h2>
            <div className="overflow-y-auto space-y-2 mb-4">
              {todasLojas.map((loja) => (
                <button
                  key={loja.id}
                  onClick={() => {
                    handleMoverLoja(loja.id, null, roteiroParaAdicionar.id);
                    setShowModalAdicionarLoja(false);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-xl border flex justify-between items-center group"
                >
                  <span className="font-medium text-sm">🏪 {loja.nome}</span>
                  <span className="text-blue-500 opacity-0 group-hover:opacity-100 font-bold text-xs">
                    + ADICIONAR
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowModalAdicionarLoja(false)}
              className="w-full py-3 bg-gray-100 rounded-xl font-bold text-gray-500"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
