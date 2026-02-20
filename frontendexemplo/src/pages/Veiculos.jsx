import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ControleVeiculos from "../components/ControleVeiculos";
import RegistroVeiculosMovimentacao from "../components/RegistroVeiculosMovimentacao";
import AlertasVeiculos from "../components/AlertasVeiculos";
import api from "../services/api";

const initialFormState = {
  tipo: "moto",
  nome: "",
  modelo: "",
  km: "",
  estado: "Bom",
  emoji: "🏍️",
  emUso: false,
  parada: false,
  modo: "trabalho",
  nivelCombustivel: "5 palzinhos",
  nivelLimpeza: "está limpo",
};

export default function Veiculos() {
  const navigate = useNavigate();
  const [modalCadastro, setModalCadastro] = useState(false);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado armazena YYYY-MM-DD para compatibilidade com input type="date"
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  const fetchVeiculos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/veiculos");
      setVeiculos(data);
    } catch (error) {
      console.error("Erro ao buscar veículos:", error);
      setVeiculos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVeiculos();
  }, [fetchVeiculos]);

  const abrirModal = () => setModalCadastro(true);

  const fecharModal = () => {
    setModalCadastro(false);
    setForm(initialFormState); // Reseta o formulário ao fechar
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name === "tipo") {
        return {
          ...prev,
          [name]: value,
          emoji: value === "moto" ? "🏍️" : "🚗",
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/veiculos", form);
      fetchVeiculos();
      fecharModal();
      alert("Veículo cadastrado com sucesso!");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      alert("Erro ao cadastrar veículo");
    }
  };

  // Função auxiliar para formatar a data para o componente filho (se necessário DD/MM/YYYY)
  //   const getDataFormatada = () => {
  //     if (!filtroData) return "";
  //     const [ano, mes, dia] = filtroData.split("-");
  //     return `${dia}/${mes}/${ano}`;
  //   };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#62A1D9] via-[#A6806A] to-[#24094E] p-0 md:p-8 text-[#24094E]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4 bg-white/80 rounded-xl shadow p-4 border border-gray-100 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-all duration-150 flex items-center gap-2"
            >
              <span>←</span> Voltar para o Dashboard
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-blue-900 drop-shadow-sm hidden sm:block">
              Veículos
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={abrirModal}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium shadow-sm transition-colors"
            >
              + Novo Veículo
            </button>
            <button
              onClick={() => setMostrarAlertas(!mostrarAlertas)}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium shadow-sm transition-colors"
            >
              {mostrarAlertas ? "Ocultar Alertas" : "Ver Alertas"}
            </button>
          </div>
        </div>

        {mostrarAlertas && (
          <div className="mb-8 animate-fadeIn">
            <AlertasVeiculos />
          </div>
        )}

        <div className="mb-8">
          <div className="bg-white/90 rounded-xl shadow p-6 border border-gray-100 mb-8 backdrop-blur-sm">
            <ControleVeiculos
              veiculos={veiculos}
              onRefresh={fetchVeiculos}
              loading={loading}
            />
          </div>

          {/* Área de Filtro de Data */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
            <label className="text-blue-900 font-medium bg-white/50 px-3 py-1 rounded-lg">
              Ver registro de movimentação de um período:
            </label>
            <input
              type="date"
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm cursor-pointer"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              placeholder="Data início"
            />
            <span className="text-gray-500">até</span>
            <input
              type="date"
              className="border rounded-lg p-2 focus:ring-2 focus:ring-blue-200 outline-none shadow-sm cursor-pointer"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              placeholder="Data fim"
            />
            {(filtroDataInicio || filtroDataFim) && (
              <button
                onClick={() => {
                  setFiltroDataInicio("");
                  setFiltroDataFim("");
                }}
                className="text-sm text-red-500 hover:text-red-700 underline"
              >
                Limpar filtro
              </button>
            )}
          </div>

          {/* Tabela de Movimentação */}
          {(filtroDataInicio || filtroDataFim) && (
            <div className="bg-white/90 rounded-xl shadow p-6 border border-gray-100 animate-fadeIn">
              <RegistroVeiculosMovimentacao
                veiculos={veiculos}
                loading={loading}
                filtroDataInicio={filtroDataInicio}
                filtroDataFim={filtroDataFim}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de cadastro */}
      {modalCadastro && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <form
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-blue-100 relative animate-fadeIn max-h-[90vh] overflow-y-auto"
            onSubmit={handleSubmit}
          >
            <h2 className="text-2xl font-bold mb-4 text-blue-900">
              Cadastrar novo veículo
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Tipo
                </label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="moto">Moto</option>
                  <option value="carro">Carro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Nome
                </label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                  required
                  placeholder="Ex: Start 160"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Modelo
                </label>
                <input
                  name="modelo"
                  value={form.modelo}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                  required
                  placeholder="Ex: Honda"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Km inicial
                </label>
                <input
                  name="km"
                  type="number"
                  value={form.km}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                  min="0"
                  required
                  onWheel={(e) => e.target.blur()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Emoji
                </label>
                <select
                  name="emoji"
                  value={form.emoji}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="🏍️">Moto 🏍️</option>
                  <option value="🚗">Carro 🚗</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Modo
                </label>
                <select
                  name="modo"
                  value={form.modo}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="trabalho">Trabalho</option>
                  <option value="emprestado">Emprestado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Nível de combustível
                </label>
                <select
                  name="nivelCombustivel"
                  value={form.nivelCombustivel}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="5 palzinhos">5 palzinhos</option>
                  <option value="4 palzinhos">4 palzinhos</option>
                  <option value="3 palzinhos">3 palzinhos</option>
                  <option value="2 palzinhos">2 palzinhos</option>
                  <option value="1 palzinho">1 palzinho</option>
                  <option value="Vazio">Vazio</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-blue-900">
                  Nível de limpeza
                </label>
                <select
                  name="nivelLimpeza"
                  value={form.nivelLimpeza}
                  onChange={handleChange}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="está limpo">Está limpo</option>
                  <option value="precisa limpar">Precisa limpar</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                onClick={fecharModal}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow"
              >
                Cadastrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
