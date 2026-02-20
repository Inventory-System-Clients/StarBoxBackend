import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { PageHeader, AlertBox } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

const EMOJIS_PELUCIA = [
  "🧸",
  "🐻",
  "🐼",
  "🐨",
  "🐰",
  "🐱",
  "🐶",
  "🐷",
  "🐯",
  "🦁",
  "🐮",
  "🐵",
  "🐣",
  "🐥",
  "🦆",
  "🐧",
  "🦉",
  "🦄",
  "🐘",
  "🦒",
];

export function ProdutoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    categoria: "",
    preco: "",
    descricao: "",
    emoji: "🧸",
    estoque_minimo: "",
    estoque_atual: "",
    ativo: true,
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isEdit) {
      carregarProduto();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const carregarProduto = async () => {
    try {
      setLoadingData(true);
      const response = await api.get(`/produtos/${id}`);
      setFormData({
        codigo: response.data.codigo || "",
        nome: response.data.nome || "",
        categoria: response.data.categoria || "",
        preco: response.data.preco || "",
        descricao: response.data.descricao || "",
        emoji: response.data.emoji || "🧸",
        estoque_minimo: response.data.estoque_minimo || "",
        estoque_atual: response.data.estoque_atual || "",
        ativo: response.data.ativo !== undefined ? response.data.ativo : true,
      });
    } catch (error) {
      setError(
        "Erro ao carregar produto: " +
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
      // Validação
      if (!formData.codigo || formData.codigo.trim() === "") {
        setError("Por favor, informe o código do produto");
        setLoading(false);
        return;
      }

      if (!formData.nome || formData.nome.trim() === "") {
        setError("Por favor, informe o nome do produto");
        setLoading(false);
        return;
      }

      const data = {
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        categoria: formData.categoria.trim(),
        preco: parseFloat(formData.preco),
        emoji: formData.emoji,
        estoque_minimo: formData.estoque_minimo
          ? parseInt(formData.estoque_minimo)
          : null,
        estoque_atual: formData.estoque_atual
          ? parseInt(formData.estoque_atual)
          : 0,
        descricao: formData.descricao?.trim() || null,
        ativo: formData.ativo,
      };

      if (isEdit) {
        await api.put(`/produtos/${id}`, data);
        setSuccess("Produto atualizado com sucesso!");
      } else {
        await api.post("/produtos", data);
        setSuccess("Produto criado com sucesso!");
      }

      setTimeout(() => navigate("/produtos"), 1500);
    } catch (error) {
      setError(error.response?.data?.error || "Erro ao salvar produto");
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
          title={isEdit ? "Editar Produto" : "Novo Produto"}
          subtitle={
            isEdit
              ? "Atualize as informações do produto"
              : "Cadastre um novo produto no sistema"
          }
          icon="🧸"
        />

        {error && (
          <AlertBox type="error" message={error} onClose={() => setError("")} />
        )}
        {success && <AlertBox type="success" message={success} />}

        <div className="card-gradient">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Visual e Identificação */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Visual e Identificação
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Emoji do Produto
                  </label>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-5xl">
                      {formData.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-10 gap-2">
                        {EMOJIS_PELUCIA.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setFormData({ ...formData, emoji })}
                            className={`w-10 h-10 rounded-lg text-2xl hover:scale-110 transition-transform ${
                              formData.emoji === emoji
                                ? "bg-primary/20 ring-2 ring-primary"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Código do Produto *
                  </label>
                  <input
                    type="text"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: PROD-001"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Urso de Pelúcia Grande"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Categoria *
                  </label>
                  <input
                    type="text"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Ursos, Coelhos, Unicórnios..."
                    list="categorias"
                    required
                  />
                  <datalist id="categorias">
                    <option value="Ursos" />
                    <option value="Coelhos" />
                    <option value="Unicórnios" />
                    <option value="Cachorros" />
                    <option value="Gatos" />
                    <option value="Outros" />
                  </datalist>
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
                      Produto Ativo
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Precificação */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  />
                </svg>
                Precificação
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preço de Venda *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                      R$
                    </span>
                    <input
                      type="number"
                      name="preco"
                      value={formData.preco}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
{/* arrumando deploy */}
              {/* Análise de Lucro por Ficha */}
              {formData.preco && (
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
                  <h4 className="text-sm font-bold text-green-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Análise de Jogadas para Lucro
                  </h4>
                  <p className="text-xs text-green-700 mb-4">
                    Quantidade mínima de jogadas necessárias para ter lucro
                    neste produto
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ficha R$ 2,50 */}
                    <div className="bg-white p-4 rounded-lg border border-green-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          💰 Ficha R$ 2,50
                        </span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">
                          Econômica
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">
                          {Math.ceil(parseFloat(formData.preco) / 2.5)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.ceil(parseFloat(formData.preco) / 2.5) === 1
                            ? "jogada mínima"
                            : "jogadas mínimas"}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Faturamento: R${" "}
                          {(
                            Math.ceil(parseFloat(formData.preco) / 2.5) * 2.5
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Ficha R$ 5,00 */}
                    <div className="bg-white p-4 rounded-lg border border-green-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">
                          💎 Ficha R$ 5,00
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">
                          Premium
                        </span>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">
                          {Math.ceil(parseFloat(formData.preco) / 5)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {Math.ceil(parseFloat(formData.preco) / 5) === 1
                            ? "jogada mínima"
                            : "jogadas mínimas"}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Faturamento: R${" "}
                          {(
                            Math.ceil(parseFloat(formData.preco) / 5) * 5
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800 flex items-center gap-2">
                      <span>💡</span>
                      <span>
                        <strong>Dica:</strong> Quanto menor o número de jogadas,
                        mais rápido você recupera o investimento. Com ficha de
                        R$ 5,00, o lucro é mais rápido!
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="input-field"
                rows="3"
                placeholder="Informações adicionais sobre o produto..."
              />
            </div>

            {/* Botões */}
            <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/produtos")}
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
                    {isEdit ? "Atualizar Produto" : "Criar Produto"}
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
