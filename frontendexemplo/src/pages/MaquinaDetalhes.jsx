import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";
import { PageHeader, Badge, AlertBox } from "../components/UIComponents";
import { PageLoader } from "../components/Loading";

export function MaquinaDetalhes() {
  const { id } = useParams();
  // const location = useLocation(); // Removido pois não é utilizado
  const [maquina, setMaquina] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [estoqueAtual, setEstoqueAtual] = useState(null);
  const [alertaInconsistencia, setAlertaInconsistencia] = useState(null);
  const [alertaAbastecimento, setAlertaAbastecimento] = useState(null);
  const [produtoUltimaMov, setProdutoUltimaMov] = useState(null);
  const [concluidaHoje, setConcluidaHoje] = useState(false);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line
  }, [id]);

  // Atualiza o estoque atual e produto da última movimentação sempre que as movimentações mudam
  useEffect(() => {
    if (movimentacoes && movimentacoes.length > 0) {
      // Considera o campo totalPos, se existir, senão tenta outros nomes comuns
      const ultimaMov = movimentacoes[0];
      const totalPos =
        ultimaMov.totalPos ?? ultimaMov.total_pos ?? ultimaMov.totalpos ?? null;
      setEstoqueAtual(totalPos);

      // Extrai produto da última movimentação
      if (
        ultimaMov.detalhesProdutos &&
        Array.isArray(ultimaMov.detalhesProdutos) &&
        ultimaMov.detalhesProdutos.length > 0
      ) {
        const prod = ultimaMov.detalhesProdutos[0];
        setProdutoUltimaMov({ nome: prod.nome, emoji: prod.emoji });
      } else {
        setProdutoUltimaMov(null);
      }
    } else {
      setEstoqueAtual(null);
      setProdutoUltimaMov(null);
    }
  }, [movimentacoes]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [
        maquinaRes,
        movimentacoesRes,
        resInconsistencia,
        resAbastecimento,
      ] = await Promise.all([
        api.get(`/maquinas/${id}`),
        api.get(`/movimentacoes?maquinaId=${id}`),
        api.get(
          `/relatorios/alertas-movimentacao-inconsistente?maquinaId=${id}`,
        ),
        api.get(`/relatorios/alertas-abastecimento-incompleto?maquinaId=${id}`),
      ]);
      setMaquina(maquinaRes.data);
      setMovimentacoes(movimentacoesRes.data);

      // Valida se o alerta realmente pertence a esta máquina
      const alertaInc = resInconsistencia.data?.alertas?.[0];
      if (alertaInc && String(alertaInc.maquinaId) === String(id)) {
        setAlertaInconsistencia(alertaInc);
      } else {
        setAlertaInconsistencia(null);
      }

      const alertaAbast = resAbastecimento.data?.alertas?.[0];
      if (alertaAbast && String(alertaAbast.maquinaId) === String(id)) {
        setAlertaAbastecimento(alertaAbast);
      } else {
        setAlertaAbastecimento(null);
      }
    } catch (error) {
      setError(
        "Erro ao carregar dados: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Verifica status de movimentação concluída para hoje
    const verificarStatus = async () => {
      try {
        const hoje = new Date().toISOString().slice(0, 10);
        const res = await api.get(
          `/status-diario?maquinaId=${id}&roteiroId=${maquina?.roteiroId}&data=${hoje}`,
        );
        setConcluidaHoje(res.data.concluida === true);
      } catch (e) {
        setConcluidaHoje(false);
      }
    };
    if (maquina && maquina.roteiroId) {
      verificarStatus();
    }
  }, [maquina]);

  if (loading) return <PageLoader />;

  if (error) return <AlertBox type="error" message={error} />;

  if (!maquina)
    return <AlertBox type="error" message="Máquina não encontrada." />;

  return (
    <div className="min-h-screen bg-background-light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex gap-4 mb-4">
          <button
            className="btn-secondary"
            onClick={() =>
              window.history.length > 1
                ? window.history.back()
                : window.location.assign("/alertas")
            }
          >
            Voltar para Alertas
          </button>
          <button
            className="btn-danger"
            onClick={async () => {
              try {
                await api.delete(
                  `/relatorios/alertas-movimentacao-inconsistente/${maquina.alertaId}`,
                  { data: { maquinaId: maquina.id } },
                );
                window.location.assign("/alertas");
              } catch (error) {
                alert("Erro ao marcar como corrigido.", error);
              }
            }}
            disabled={!maquina.alertaId}
            title="Marcar este alerta como corrigido"
          >
            Corrigido
          </button>
        </div>
        <PageHeader
          title={`Informações da Máquina: ${maquina.nome}`}
          subtitle={maquina.codigo}
          icon="🎰"
        />
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          {/* Detalhes dos alertas */}
          {alertaInconsistencia && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-900">
              <strong>Alerta de Inconsistência:</strong>{" "}
              {alertaInconsistencia.mensagem ||
                `Inconsistência detectada: OUT (${alertaInconsistencia.contador_out})/IN (${alertaInconsistencia.contador_in}) não bate com fichas (${alertaInconsistencia.fichas}).`}
            </div>
          )}
          {alertaAbastecimento && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-900">
              <strong>Alerta de Abastecimento Incompleto:</strong>{" "}
              {alertaAbastecimento.mensagem ||
                `Abastecimento incompleto: padrão ${
                  alertaAbastecimento.padrao
                }, tinha ${alertaAbastecimento.anterior}, abastecido ${
                  alertaAbastecimento.abastecido
                }. Motivo: ${alertaAbastecimento.observacao || "-"}`}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p>
                <strong>Tipo:</strong>{" "}
                {produtoUltimaMov ? (
                  <span>
                    {produtoUltimaMov.emoji ? (
                      <span>{produtoUltimaMov.emoji}</span>
                    ) : null}{" "}
                    {produtoUltimaMov.nome}
                  </span>
                ) : (
                  <>
                    {maquina.emoji ? <span>{maquina.emoji}</span> : null}{" "}
                    {maquina.tipo || "-"}
                  </>
                )}
              </p>
              <p>
                <strong>Capacidade:</strong>{" "}
                {maquina.capacidadePadrao || maquina.capacidade || "-"}
              </p>
              <p>
                <strong>Estoque Atual:</strong>{" "}
                {estoqueAtual !== null && estoqueAtual !== undefined
                  ? estoqueAtual
                  : "-"}
              </p>
              <p>
                <strong>Valor da Ficha:</strong> R${" "}
                {typeof maquina.valorFicha === "number"
                  ? maquina.valorFicha.toFixed(2)
                  : maquina.valorFicha || "-"}
              </p>
            </div>
            <div>
              <p>
                <strong>Força Fraca:</strong> {maquina.forcaFraca ?? "-"}%
              </p>
              <p>
                <strong>Força Forte:</strong> {maquina.forcaForte ?? "-"}%
              </p>
              <p>
                <strong>Força Premium:</strong> {maquina.forcaPremium ?? "-"}%
              </p>
              <p>
                <strong>Jogadas Premium:</strong>{" "}
                {maquina.jogadasPremium ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Movimentações</h2>
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          {movimentacoes.length === 0 ? (
            <p className="text-gray-500">Nenhuma movimentação encontrada.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2">Data</th>
                  <th className="text-left py-2">Entrada</th>
                  <th className="text-left py-2">Saída</th>
                  <th className="text-left py-2">Fichas</th>
                  <th className="text-left py-2">Observação</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((mov) => (
                  <tr key={mov.id} className="border-b">
                    <td>
                      {new Date(mov.dataColeta || mov.createdAt).toLocaleString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="text-green-600">
                      {mov.abastecidas > 0 ? `+${mov.abastecidas}` : "-"}
                    </td>
                    <td className="text-red-600">
                      {mov.sairam > 0 ? `-${mov.sairam}` : "-"}
                    </td>
                    <td>{mov.fichas || 0}</td>
                    <td>{mov.observacoes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Botão de movimentação */}
        <button
          className={`btn-primary ${concluidaHoje ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={concluidaHoje}
          title={
            concluidaHoje
              ? "Movimentação já registrada hoje"
              : "Registrar movimentação"
          }
        >
          {concluidaHoje
            ? "Movimentação concluída hoje"
            : "Registrar movimentação"}
        </button>
      </div>
      <Footer />
    </div>
  );
}

export default MaquinaDetalhes;
