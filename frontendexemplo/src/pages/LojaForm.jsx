import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { PageHeader, AlertBox } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function LojaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    nome: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    telefone: "",
    responsavel: "",
    ativo: true,
  });

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Estados para gerenciar estoque do depósito
  const [produtos, setProdutos] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [loadingEstoque, setLoadingEstoque] = useState(false);
  const [salvandoEstoque, setSalvandoEstoque] = useState(false);

  useEffect(() => {
    if (isEdit) {
      carregarLoja();
    }
    carregarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isEdit && produtos.length > 0) {
      carregarEstoque();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, produtos]);

  const carregarProdutos = async () => {
    try {
      const response = await api.get("/produtos");
      setProdutos(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const carregarEstoque = async () => {
    try {
      setLoadingEstoque(true);
      const response = await api.get(`/estoque-lojas/${id}`);
      setEstoque(response.data || []);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
      setEstoque([]);
    } finally {
      setLoadingEstoque(false);
    }
  };

  const carregarLoja = async () => {
    try {
      setLoadingData(true);
      const response = await api.get(`/lojas/${id}`);
      setFormData(response.data);
    } catch (error) {
      setError(
        "Erro ao carregar loja: " +
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
      if (!formData.nome || formData.nome.trim() === "") {
        setError("Por favor, informe o nome da loja");
        setLoading(false);
        return;
      }

      const data = {
        nome: formData.nome.trim(),
        endereco: formData.endereco.trim(),
        cidade: formData.cidade.trim(),
        estado: formData.estado,
        cep: formData.cep?.trim() || null,
        telefone: formData.telefone.trim(),
        responsavel: formData.responsavel?.trim() || null,
        ativo: formData.ativo,
      };

      if (isEdit) {
        await api.put(`/lojas/${id}`, data);
        setSuccess("Loja atualizada com sucesso!");
      } else {
        await api.post("/lojas", data);
        setSuccess("Loja criada com sucesso!");
      }

      setTimeout(() => navigate("/lojas"), 1500);
    } catch (error) {
      setError(error.response?.data?.error || "Erro ao salvar loja");
    } finally {
      setLoading(false);
    }
  };

  const atualizarQuantidadeEstoque = (produtoId, quantidade) => {
    setEstoque((prev) => {
      const itemExiste = prev.find((item) => item.produtoId === produtoId);
      if (itemExiste) {
        return prev.map((item) =>
          item.produtoId === produtoId
            ? { ...item, quantidade: parseInt(quantidade) || 0 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            produtoId,
            quantidade: parseInt(quantidade) || 0,
            estoqueMinimo: 0,
          },
        ];
      }
    });
  };

  const atualizarEstoqueMinimoEstoque = (produtoId, estoqueMinimo) => {
    setEstoque((prev) => {
      const itemExiste = prev.find((item) => item.produtoId === produtoId);
      if (itemExiste) {
        return prev.map((item) =>
          item.produtoId === produtoId
            ? { ...item, estoqueMinimo: parseInt(estoqueMinimo) || 0 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            produtoId,
            quantidade: 0,
            estoqueMinimo: parseInt(estoqueMinimo) || 0,
          },
        ];
      }
    });
  };

  const salvarEstoque = async () => {
    try {
      setSalvandoEstoque(true);
      setError("");

      // Validar se os produtos existem antes de salvar
      const produtosValidos = estoque.filter((item) => {
        const produtoExiste = produtos.some((p) => p.id === item.produtoId);
        if (!produtoExiste) {
          console.warn(
            `⚠️ Produto ${item.produtoId} não existe mais, ignorando...`
          );
        }
        return produtoExiste;
      });

      console.log(
        `📊 Salvando ${produtosValidos.length} produtos válidos (incluindo quantidades zeradas)`
      );

      // Sempre usar POST que faz findOrCreate automaticamente
      for (const item of produtosValidos) {
        try {
          // POST /estoque-lojas/:lojaId cria ou atualiza usando findOrCreate
          await api.post(`/estoque-lojas/${id}`, {
            produtoId: item.produtoId,
            quantidade: item.quantidade || 0,
            estoqueMinimo: item.estoqueMinimo || 0,
          });
        } catch (itemError) {
          console.error(
            `❌ Erro ao salvar produto ${item.produtoId}:`,
            itemError.response?.data || itemError.message
          );
          // Continuar com os próximos itens mesmo se um falhar
        }
      }

      setSuccess("Estoque atualizado com sucesso!");
      await carregarEstoque();
    } catch (error) {
      setError(
        "Erro ao salvar estoque: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setSalvandoEstoque(false);
    }
  };

  const getQuantidadeProduto = (produtoId) => {
    const item = estoque.find((e) => e.produtoId === produtoId);
    return item?.quantidade || 0;
  };

  const getEstoqueMinimoProduto = (produtoId) => {
    const item = estoque.find((e) => e.produtoId === produtoId);
    return item?.estoqueMinimo || 0;
  };

  if (loadingData) return <PageLoader />;

  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title={isEdit ? "Editar Loja" : "Nova Loja"}
          subtitle={
            isEdit
              ? "Atualize as informações da loja"
              : "Cadastre uma nova loja no sistema"
          }
          icon="🏪"
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
                    Nome da Loja *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Ex: Loja Shopping Center"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Responsável
                  </label>
                  <input
                    type="text"
                    name="responsavel"
                    value={formData.responsavel}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Nome do responsável"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Telefone *
                  </label>
                  <input
                    type="tel"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="(11) 99999-9999"
                    required
                  />
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
                      Loja Ativa
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                Endereço
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Endereço Completo *
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Rua, número, complemento"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="São Paulo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estado *
                  </label>
                  <select
                    name="estado"
                    value={formData.estado}
                    onChange={handleChange}
                    className="select-field"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>

            {/* Estoque do Depósito - Apenas para edição */}
            {isEdit && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                      <path
                        fillRule="evenodd"
                        d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Estoque do Depósito
                  </h3>
                  {loadingEstoque && (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    💡 Configure aqui o estoque de produtos disponíveis no
                    depósito desta loja. Estes produtos podem ser transferidos
                    para as máquinas.
                  </p>
                </div>

                {produtos.length > 0 ? (
                  <div className="space-y-3">
                    {produtos.map((produto) => (
                      <div
                        key={produto.id}
                        className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary/30 transition-colors bg-white"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-3xl">
                            {produto.emoji || "📦"}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">
                              {produto.nome}
                            </h4>
                            {produto.codigo && (
                              <p className="text-xs text-gray-500">
                                Cód: {produto.codigo}
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Quantidade
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getQuantidadeProduto(produto.id)}
                                onChange={(e) =>
                                  atualizarQuantidadeEstoque(
                                    produto.id,
                                    e.target.value
                                  )
                                }
                                className="input-field text-center w-24"
                                disabled={loadingEstoque}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                Estoque Mín.
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getEstoqueMinimoProduto(produto.id)}
                                onChange={(e) =>
                                  atualizarEstoqueMinimoEstoque(
                                    produto.id,
                                    e.target.value
                                  )
                                }
                                className="input-field text-center w-24"
                                disabled={loadingEstoque}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={salvarEstoque}
                        className="btn-primary"
                        disabled={salvandoEstoque || loadingEstoque}
                      >
                        {salvandoEstoque ? (
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
                            Salvando Estoque...
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
                            Salvar Estoque
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-4xl mb-2">📦</p>
                    <p>Nenhum produto cadastrado no sistema</p>
                    <p className="text-sm mt-1">
                      Cadastre produtos primeiro em Produtos
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-4 justify-end pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate("/lojas")}
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
                    {isEdit ? "Atualizar Loja" : "Criar Loja"}
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
