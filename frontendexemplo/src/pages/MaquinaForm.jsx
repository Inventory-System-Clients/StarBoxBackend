import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { PageHeader, AlertBox } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function MaquinaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    loja_id: "",
    tipo: "",
    capacidadePadrao: "",
    valorFicha: "",
    fichasNecessarias: "",
    forcaForte: "",
    forcaFraca: "",
    forcaPremium: "",
    jogadasPremium: "",
    percentualAlertaEstoque: "",
    localizacao: "",
    ativo: true,
  });

  const [lojas, setLojas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    carregarLojas();
    if (isEdit) {
      carregarMaquina();
    } else {
      setLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarLojas = async () => {
    try {
      const response = await api.get("/lojas");
      setLojas(response.data.filter((l) => l.ativo));
    } catch (error) {
      setError(
        "Erro ao carregar lojas: " +
          (error.response?.data?.error || error.message)
      );
    }
  };

  const carregarMaquina = async () => {
    try {
      setLoadingData(true);
      const response = await api.get(`/maquinas/${id}`);
      setFormData({
        codigo: response.data.codigo || "",
        nome: response.data.nome || "",
        loja_id: response.data.lojaId ? String(response.data.lojaId) : "",
        tipo: response.data.tipo || "",
        capacidadePadrao: response.data.capacidadePadrao || "",
        valorFicha: response.data.valorFicha || "",
        fichasNecessarias: response.data.fichasNecessarias || "",
        forcaForte: response.data.forcaForte || "",
        forcaFraca: response.data.forcaFraca || "",
        forcaPremium: response.data.forcaPremium || "",
        jogadasPremium: response.data.jogadasPremium || "",
        percentualAlertaEstoque:
          response.data.percentualAlertaEstoque || 20,
        localizacao: response.data.localizacao || "",
        ativo: response.data.ativo !== undefined ? response.data.ativo : true,
      });
    } catch (error) {
      setError(
        "Erro ao carregar máquina: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Validação adicional
      console.log("FormData completo:", formData); // Debug
      console.log(
        "loja_id:",
        formData.loja_id,
        "tipo:",
        typeof formData.loja_id
      ); // Debug

      if (!formData.loja_id || formData.loja_id === "") {
        setError("Por favor, selecione uma loja");
        setLoading(false);
        return;
      }

      if (!formData.codigo || formData.codigo.trim() === "") {
        setError("Por favor, informe o código da máquina");
        setLoading(false);
        return;
      }

      const data = {
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        lojaId: formData.loja_id,
        tipo: formData.tipo?.trim() || null,
        capacidadePadrao: parseInt(formData.capacidadePadrao, 10) || 0,
        valorFicha: parseFloat(formData.valorFicha) || 0,
        fichasNecessarias: parseInt(formData.fichasNecessarias, 10) || null,
        forcaForte: parseInt(formData.forcaForte, 10) || null,
        forcaFraca: parseInt(formData.forcaFraca, 10) || null,
        forcaPremium: parseInt(formData.forcaPremium, 10) || null,
        jogadasPremium: parseInt(formData.jogadasPremium, 10) || null,
        percentualAlertaEstoque:
          parseInt(formData.percentualAlertaEstoque, 10) || 20,
        localizacao: formData.localizacao?.trim() || null,
        ativo: formData.ativo,
      };

      console.log("Dados enviados:", JSON.stringify(data, null, 2)); // Debug detalhado

      if (isEdit) {
        await api.put(`/maquinas/${id}`, data);
        setSuccess("Máquina atualizada com sucesso!");
      } else {
        await api.post("/maquinas", data);
        setSuccess("Máquina criada com sucesso!");
      }

      setTimeout(() => navigate("/maquinas"), 1500);
    } catch (error) {
      setError(error.response?.data?.error || "Erro ao salvar máquina");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={isEdit ? "Editar Máquina" : "Nova Máquina"}
          subtitle={
            isEdit
              ? "Atualize as informações da máquina"
              : "Cadastre uma nova máquina no sistema"
          }
          icon="🎰"
        />

        {error && (
          <AlertBox type="error" message={error} onClose={() => setError("")} />
        )}
        {success && <AlertBox type="success" message={success} />}

        <div className="card-gradient">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Informações Básicas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código da Máquina *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: MAQ-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Máquina Principal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Loja *
                  </label>
                  <select
                    name="loja_id"
                    value={formData.loja_id}
                    onChange={handleChange}
                    className="select-field"
                    required
                  >
                    <option value="">Selecione uma loja...</option>
                    {lojas.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {loja.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="ativo"
                      checked={formData.ativo}
                      onChange={handleChange}
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Máquina Ativa
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Configurações */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                Configurações
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Máquina
                  </label>
                  <input
                    type="text"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Garra, Empurrador, etc."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tipo ou modelo da máquina
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Capacidade Padrão *
                  </label>
                  <input
                    type="number"
                    name="capacidadePadrao"
                    value={formData.capacidadePadrao}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 100"
                    min="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Capacidade máxima de produtos
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valor da Ficha (R$)
                  </label>
                  <input
                    type="number"
                    name="valorFicha"
                    value={formData.valorFicha}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 2.00"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valor cobrado por ficha
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🎫 Fichas para Jogar
                  </label>
                  <input
                    type="number"
                    name="fichasNecessarias"
                    value={formData.fichasNecessarias}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 1"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Quantas fichas são necessárias para liberar uma jogada
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    💪 Força Forte (%)
                  </label>
                  <input
                    type="number"
                    name="forcaForte"
                    value={formData.forcaForte}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 90"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Parâmetro de força forte da garra (0-100%)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🤏 Força Fraca (%)
                  </label>
                  <input
                    type="number"
                    name="forcaFraca"
                    value={formData.forcaFraca}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 30"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Parâmetro de força fraca da garra (0-100%)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    ⭐ Força Premium (%)
                  </label>
                  <input
                    type="number"
                    name="forcaPremium"
                    value={formData.forcaPremium}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 100"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Parâmetro de força premium da garra (0-100%)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🎮 Jogadas para Força Premium
                  </label>
                  <input
                    type="number"
                    name="jogadasPremium"
                    value={formData.jogadasPremium}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 10"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Quantidade de jogadas com força premium
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Alerta de Estoque (%)
                  </label>
                  <input
                    type="number"
                    name="percentualAlertaEstoque"
                    value={formData.percentualAlertaEstoque}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: 20"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Percentual mínimo para alerta (padrão: 20%)
                  </p>
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                    clipRule="evenodd"
                  />
                </svg>
                Localização
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Localização na Loja
                  </label>
                  <textarea
                    name="localizacao"
                    value={formData.localizacao}
                    onChange={handleChange}
                    className="input-field"
                    rows="3"
                    placeholder="Ex: Entrada principal, lado direito próximo ao balcão..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Descrição da localização da máquina na loja
                  </p>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/maquinas")}
                className="btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {isEdit ? "Atualizar Máquina" : "Criar Máquina"}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}
