import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";

export default function RegistroVeiculos({
  veiculos = [],
  loading,
  filtroDataInicio = "",
  filtroDataFim = "",
}) {
  const { usuario } = useContext(AuthContext);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filtroVeiculo, setFiltroVeiculo] = useState("");
  const [carregandoMov, setCarregandoMov] = useState(false);

  useEffect(() => {
    if (!usuario || usuario.role !== "ADMIN") return;
    console.log(
      "[RegistroVeiculos] filtroDataInicio:",
      filtroDataInicio,
      "filtroDataFim:",
      filtroDataFim,
    );
    const fetchMov = async () => {
      setCarregandoMov(true);
      try {
        const params = {};
        if (filtroVeiculo) params.veiculoId = filtroVeiculo;
        if (filtroDataInicio) params.dataInicio = filtroDataInicio;
        if (filtroDataFim) params.dataFim = filtroDataFim;
        const { data } = await api.get("/movimentacao-veiculos", { params });
        console.log("[RegistroVeiculos] dados recebidos:", data);
        setMovimentacoes(data);
      } catch (e) {
        setMovimentacoes([]);
        console.error("Erro ao buscar movimentações:", e);
      } finally {
        setCarregandoMov(false);
      }
    };
    fetchMov();
  }, [usuario, filtroVeiculo, filtroDataInicio, filtroDataFim]);

  if (!usuario || usuario.role !== "ADMIN") return null;
  if (loading) return <div className="p-6">Carregando veículos...</div>;

  return (
    <div className="p-0 md:p-2">
      <h2 className="text-2xl font-bold mb-6 text-blue-900 tracking-tight drop-shadow-sm">
        Registro de Movimentação
      </h2>
      <div className="mb-2 text-sm text-gray-600">
        {carregandoMov
          ? "Buscando registros..."
          : `Registros encontrados: ${movimentacoes.length}`}
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1 text-blue-900">
            Filtrar por veículo
          </label>
          <select
            className="border rounded-lg p-2 w-full focus:ring-2 focus:ring-blue-200"
            value={filtroVeiculo}
            onChange={(e) => setFiltroVeiculo(e.target.value)}
          >
            <option value="">Todos</option>
            {veiculos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow bg-white/90">
        <table className="min-w-full text-sm text-gray-800">
          <thead>
            <tr className="bg-blue-50 text-blue-900">
              <th className="px-4 py-3 border-b font-semibold">Veículo</th>
              <th className="px-4 py-3 border-b font-semibold">Usuário</th>
              <th className="px-4 py-3 border-b font-semibold">Tipo</th>
              <th className="px-4 py-3 border-b font-semibold">Data/Hora</th>
              <th className="px-4 py-3 border-b font-semibold">Gasolina</th>
              <th className="px-4 py-3 border-b font-semibold">
                Nível Limpeza
              </th>
              <th className="px-4 py-3 border-b font-semibold">Estado</th>
              <th className="px-4 py-3 border-b font-semibold">Modo</th>
              <th className="px-4 py-3 border-b font-semibold">Km</th>{" "}
              {/* NOVA COLUNA */}
              <th className="px-4 py-3 border-b font-semibold">Observação</th>
            </tr>
          </thead>
          <tbody>
            {carregandoMov ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-center p-6 text-blue-700 font-semibold animate-pulse"
                >
                  Carregando movimentações...
                </td>
              </tr>
            ) : movimentacoes.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center p-6 text-gray-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : (
              movimentacoes.map((mov) => {
                // Lógica de cor: vermelho se estado ruim OU ambos, amarelo se só precisa limpar
                const isRuim = mov.estado?.toLowerCase() === "ruim";
                const precisaLimpar = mov.nivel_limpeza
                  ?.toLowerCase()
                  .includes("precisa");
                let rowClass = "text-center hover:bg-blue-50 transition";
                if (isRuim && precisaLimpar) {
                  rowClass += " bg-red-100 !hover:bg-red-200";
                } else if (isRuim) {
                  rowClass += " bg-red-100 !hover:bg-red-200";
                } else if (precisaLimpar) {
                  rowClass += " bg-yellow-100 !hover:bg-yellow-200";
                }
                return (
                  <tr key={mov.id} className={rowClass}>
                    <td className="px-4 py-2 border-b">
                      {mov.veiculo?.nome || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {mov.usuario?.nome || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${mov.tipo === "retirada" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}`}
                      >
                        {mov.tipo === "retirada" ? "Retirada" : "Devolução"}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b whitespace-nowrap">
                      {new Date(mov.dataHora).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {mov.gasolina || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {mov.nivel_limpeza || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {mov.estado === "Bom"
                        ? "Sem avaria"
                        : mov.estado === "Ruim"
                          ? "Com avaria"
                          : mov.estado || "-"}
                    </td>
                    <td className="px-4 py-2 border-b">{mov.modo || "-"}</td>
                    <td className="px-4 py-2 border-b">{mov.km ?? "-"}</td>{" "}
                    {/* NOVO DADO */}
                    <td className="px-4 py-2 border-b text-left">
                      {mov.obs || mov.observacao || "-"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
