import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { AlertBox, Modal } from "./UIComponents";

export default function AlertAdmin() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertaSelecionado, setAlertaSelecionado] = useState(null);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (usuario?.role === "ADMIN") {
      carregarAlertas();
    } else {
      setLoading(false);
    }
  }, [usuario]);

  const carregarAlertas = async () => {
    setLoading(true);
    setErro("");
    try {
      const [resInconsistencia, resAbastecimento] = await Promise.all([
        api.get("/relatorios/alertas-movimentacao-inconsistente"),
        api.get("/relatorios/alertas-abastecimento-incompleto")
      ]);

      const alertasInconsistencia = resInconsistencia.data?.alertas || [];
      const alertasAbastecimento = resAbastecimento.data?.alertas || [];

      setAlertas([...alertasInconsistencia, ...alertasAbastecimento]);
    } catch (error) {
      setErro("Erro ao buscar alertas de movimentação.");
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  };

  const corrigirAlerta = async (alertaId, maquinaId) => {
    if (!window.confirm("Deseja marcar este alerta como corrigido?")) return;
    
    setRemovendo(true);
    try {
      await api.delete(`/relatorios/alertas-movimentacao-inconsistente/${alertaId}`, {
        data: { maquinaId },
      });
      await carregarAlertas();
    } catch (error) {
      setErro("Erro ao remover alerta. Tente novamente.");
    } finally {
      setRemovendo(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Carregando alertas...</div>;
  if (usuario?.role !== "ADMIN") return null;

  return (
    <div className="max-w-3xl mx-auto mt-8 px-4">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[#24094E]">
        <span className="bg-yellow-100 p-2 rounded-lg">⚠️</span> 
        Alertas de Inconsistência
      </h2>

      {erro && <AlertBox type="error" message={erro} className="mb-4" />}

      {alertas.length === 0 ? (
        <AlertBox type="success" message="Tudo certo! Nenhum alerta encontrado." />
      ) : (
        <div className="grid gap-4">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="bg-white border-l-4 border-[#62A1D9] rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-black uppercase bg-[#62A1D9]/10 text-[#62A1D9] px-2 py-1 rounded">
                      {alerta.tipo === "abastecimento_incompleto" ? "Abastecimento" : "Contadores"}
                    </span>
                    <span className="text-gray-400 text-xs">ID: {alerta.id}</span>
                  </div>
                  
                  <h3 className="font-bold text-[#24094E] text-lg">
                    Máquina: {alerta.maquinaNome || `ID ${alerta.maquinaId}`}
                  </h3>
                  
                  {/* Conteúdo dinâmico conforme o tipo */}
                  <div className="mt-3 space-y-1">
                    {alerta.tipo === "abastecimento_incompleto" ? (
                      <AbastecimentoInfo alerta={alerta} />
                    ) : (
                      <InconsistenciaInfo alerta={alerta} />
                    )}
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => navigate(`/maquinas/${alerta.maquinaId}`)}
                    className="flex-1 px-4 py-2 text-sm bg-gray-100 text-[#24094E] font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Ver Máquina
                  </button>
                  <button
                    onClick={() => corrigirAlerta(alerta.id, alerta.maquinaId)}
                    disabled={removendo}
                    className="flex-1 px-4 py-2 text-sm bg-[#24094E] text-white font-semibold rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
                  >
                    {removendo ? "..." : "Corrigido"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* ... Modal se mantém similar ... */}
    </div>
  );
}

// Sub-componentes para organizar a visualização dos dados
const AbastecimentoInfo = ({ alerta }) => (
  <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100">
    <p><strong>Capacidade:</strong> {alerta.capacidadePadrao || alerta.padrao} un.</p>
    <p><strong>Fluxo:</strong> {alerta.totalAntes} → +{alerta.abastecido} → Final: {alerta.totalDepois}</p>
    <p className="text-xs italic mt-1">Obs: {alerta.observacao || "Sem observações"}</p>
  </div>
);

const InconsistenciaInfo = ({ alerta }) => (
  <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-100">
    <div className="grid grid-cols-2 gap-2">
      <p><strong>OUT:</strong> {alerta.contador_out ?? "-"}</p>
      <p><strong>IN:</strong> {alerta.contador_in ?? "-"}</p>
      <p><strong>Fichas:</strong> {alerta.fichas ?? "-"}</p>
      <p><strong>Saíram:</strong> {alerta.sairam ?? "-"}</p>
    </div>
    {alerta.mensagem && (
      <p className="text-xs text-red-600 font-medium mt-2 border-t border-red-100 pt-1">
        {alerta.mensagem}
      </p>
    )}
  </div>
);