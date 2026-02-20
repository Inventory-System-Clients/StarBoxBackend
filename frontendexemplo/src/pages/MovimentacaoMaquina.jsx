import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";

export default function MovimentacaoMaquina() {
  const { roteiroId, lojaId, maquinaId } = useParams();
  const navigate = useNavigate();

  // Estados para formulário
  const [formData, setFormData] = useState({
    produto_id: "",
    quantidadeAtualMaquina: "",
    quantidadeAdicionada: "",
    contadorInManual: "",
    contadorOutManual: "",
    contadorInDigital: "",
    contadorOutDigital: "",
    observacao: "",
    retiradaEstoque: false,
    retiradaProduto: 0,
    ignoreInOut: false,
  });
  const [produtos, setProdutos] = useState([]);
  const [maquina, setMaquina] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [maqRes, prodRes] = await Promise.all([
          api.get(`/maquinas/${maquinaId}`),
          api.get("/produtos"),
        ]);
        setMaquina(maqRes.data);
        setProdutos(prodRes.data);
      } catch (err) {
        setError("Erro ao carregar dados da máquina ou produtos.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [maquinaId]);

  // Cálculo automático da quantidade atual da máquina usando backend (prioriza digital)
  useEffect(() => {
    async function calcularBackend() {
      const inDigital = formData.contadorInDigital;
      const outDigital = formData.contadorOutDigital;
      if (
        inDigital !== "" &&
        outDigital !== "" &&
        maquina &&
        !formData.ignoreInOut
      ) {
        try {
          const res = await api.get(
            `/maquinas/${maquinaId}/calcular-quantidade`,
            {
              params: {
                maquinaId,
                contadorIn: inDigital,
                contadorOut: outDigital,
              },
            },
          );
          setFormData((prev) => ({
            ...prev,
            quantidadeAtualMaquina:
              res.data.quantidadeAtual >= 0 ? res.data.quantidadeAtual : 0,
          }));
        } catch (err) {
          // fallback para cálculo local se erro
          const inVal = parseInt(inDigital) || 0;
          const outVal = parseInt(outDigital) || 0;
          const capacidade = parseInt(maquina.capacidadePadrao) || 0;
          const quantidadeAtual = capacidade - (outVal - inVal);
          setFormData((prev) => ({
            ...prev,
            quantidadeAtualMaquina: quantidadeAtual >= 0 ? quantidadeAtual : 0,
          }));
        }
      }
    }
    calcularBackend();
  }, [
    formData.contadorInDigital,
    formData.contadorOutDigital,
    maquina,
    formData.ignoreInOut,
    maquinaId,
  ]);

  // Sugestão de abastecimento usando backend (prioriza digital)
  const [sugestaoAbastecimento, setSugestaoAbastecimento] = useState(null);
  useEffect(() => {
    async function calcularSugestao() {
      const inDigital = formData.contadorInDigital;
      const outDigital = formData.contadorOutDigital;
      if (
        inDigital !== "" &&
        outDigital !== "" &&
        maquina &&
        !formData.ignoreInOut
      ) {
        try {
          const res = await api.get(
            `/maquinas/${maquinaId}/calcular-quantidade`,
            {
              params: {
                maquinaId,
                contadorIn: inDigital,
                contadorOut: outDigital,
              },
            },
          );
          setSugestaoAbastecimento(res.data.sugestaoAbastecimento);
        } catch (err) {
          setSugestaoAbastecimento(null);
        }
      } else {
        setSugestaoAbastecimento(null);
      }
    }
    calcularSugestao();
  }, [
    formData.contadorInDigital,
    formData.contadorOutDigital,
    maquina,
    formData.ignoreInOut,
    maquinaId,
  ]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    console.log(
      `[Movimentacao] Enviando: maquinaId=${maquinaId}, roteiroId=${roteiroId}`,
    );
    console.log("[Movimentacao] formData:", JSON.stringify(formData));
    try {
      await api.post("/movimentacoes", {
        maquinaId: maquinaId,
        roteiroId: roteiroId,
        totalPre: parseInt(formData.quantidadeAtualMaquina) || 0,
        abastecidas: parseInt(formData.quantidadeAdicionada) || 0,
        fichas: parseInt(formData.fichas) || 0,
        contadorIn: parseInt(formData.contadorInManual) || null,
        contadorOut: parseInt(formData.contadorOutManual) || null,
        quantidade_notas_entrada: formData.quantidade_notas_entrada
          ? parseFloat(formData.quantidade_notas_entrada)
          : null,
        valor_entrada_maquininha_pix: formData.valor_entrada_maquininha_pix
          ? parseFloat(formData.valor_entrada_maquininha_pix)
          : null,
        retiradaEstoque: formData.retiradaEstoque,
        retiradaProduto: parseInt(formData.retiradaProduto) || 0,
        observacoes: formData.observacao || "",
        produtos: [
          {
            produtoId: formData.produto_id,
            quantidadeSaiu: 0,
            quantidadeAbastecida: parseInt(formData.quantidadeAdicionada) || 0,
            retiradaProduto: parseInt(formData.retiradaProduto) || 0,
          },
        ],
      });
      setSuccess("Movimentação registrada com sucesso!");
      setTimeout(() => {
        navigate(`/roteiros/${roteiroId}/executar`, { replace: true });
      }, 1200);
    } catch (err) {
      setError("Erro ao registrar movimentação.");
    }
  };

  if (loading)
    return <div className="p-20 text-center font-bold">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-[#24094E]">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="card-gradient mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Registrar Movimentação
          </h3>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <strong>Como funciona:</strong> Informe quantos produtos tem AGORA
              na máquina (o sistema calcula o que saiu). Se abastecer, informe
              quantos foram adicionados.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📥 Contador IN Digital (Entrada)
                </label>
                <input
                  type="number"
                  name="contadorInDigital"
                  value={formData.contadorInDigital}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número do contador IN Digital da máquina
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📤 Contador OUT Digital (Saída)
                </label>
                <input
                  type="number"
                  name="contadorOutDigital"
                  value={formData.contadorOutDigital}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número do contador OUT Digital da máquina
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📥 Contador IN Manual
                </label>
                <input
                  type="number"
                  name="contadorInManual"
                  value={formData.contadorInManual}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número do contador IN manual
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📤 Contador OUT Manual
                </label>
                <input
                  type="number"
                  name="contadorOutManual"
                  value={formData.contadorOutManual}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Número do contador OUT manual
                </p>
              </div>
            </div>
            <div className="flex items-center mt-2 mb-4">
              <input
                type="checkbox"
                id="ignoreInOut"
                name="ignoreInOut"
                checked={formData.ignoreInOut || false}
                onChange={handleChange}
                className="mr-2"
              />
              <label htmlFor="ignoreInOut" className="text-sm text-gray-700">
                Não preciso informar IN/OUT nesta movimentação
              </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Quantidade Atual na Máquina *
                </label>
                <input
                  type="number"
                  name="quantidadeAtualMaquina"
                  value={formData.quantidadeAtualMaquina}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quantos produtos tem agora
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Quantidade Adicionada
                </label>
                <input
                  type="number"
                  name="quantidadeAdicionada"
                  value={formData.quantidadeAdicionada}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quantos produtos foram adicionados
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ❌ Retirada de Produto
                </label>
                <input
                  type="number"
                  name="retiradaProduto"
                  value={formData.retiradaProduto}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="0"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quantidade de produtos retirados (não conta como saída
                  financeira)
                </p>
                <label className="flex items-center mt-2 gap-2">
                  <input
                    type="checkbox"
                    name="retiradaProdutoDevolverEstoque"
                    checked={formData.retiradaProdutoDevolverEstoque || false}
                    onChange={handleChange}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <span className="text-xs text-green-700">
                    Devolver retirada para o estoque da loja
                  </span>
                </label>
              </div>
            </div>
            <div className="p-4 bg-linear-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="retiradaEstoque"
                  checked={formData.retiradaEstoque}
                  onChange={handleChange}
                  className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-bold text-orange-900">
                    📦 Retirada de Estoque (não conta como dinheiro)
                  </span>
                  <p className="text-xs text-orange-700 mt-1">
                    Marque esta opção quando estiver retirando produtos da
                    máquina sem que seja uma venda (exemplo: produtos
                    danificados, devolução, transferência). As fichas serão
                    automaticamente zeradas.
                  </p>
                </div>
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Produto *
              </label>
              <select
                name="produto_id"
                value={formData.produto_id}
                onChange={handleChange}
                className="select-field"
                required
              >
                <option value="">Selecione um produto</option>
                {produtos.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Observação
              </label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                className="input-field"
                rows="2"
                placeholder="Informações adicionais sobre a movimentação..."
              />
            </div>
            <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-secondary"
              >
                Voltar
              </button>
              <button type="submit" className="btn-primary">
                Registrar Movimentação
              </button>
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
            {success && <div className="text-green-600 mt-2">{success}</div>}
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
