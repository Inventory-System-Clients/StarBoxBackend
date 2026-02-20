import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";

export default function RoteiroExecucao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [roteiro, setRoteiro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lojaSelecionada, setLojaSelecionada] = useState(null);

  useEffect(() => {
    async function fetchRoteiro() {
      try {
        setLoading(true);
        const res = await api.get(`/roteiros/${id}/executar`);
        setRoteiro(res.data);
        console.log('Roteiro carregado:', res.data);
      } catch (err) {
        setError("Erro ao buscar roteiro.");
      } finally {
        setLoading(false);
      }
    }
    fetchRoteiro();
  }, [id]);

  if (loading)
    return <div className="p-20 text-center font-bold">Carregando...</div>;
  if (error)
    return (
      <div className="p-20 text-center text-red-600 font-bold">{error}</div>
    );
  if (!roteiro)
    return (
      <div className="p-20 text-center font-bold">Roteiro não encontrado.</div>
    );

  return (
    <div className="min-h-screen bg-gray-100 text-[#24094E]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1
          className={`text-2xl font-bold mb-6 flex items-center gap-2 ${roteiro.status === "finalizado" ? "text-green-600" : ""}`}
        >
          Execução do Roteiro: {roteiro.nome}
          {roteiro.status === "finalizado" && (
            <span className="ml-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-semibold">Finalizado</span>
          )}
        </h1>
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2">
            Selecione uma loja para movimentar:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roteiro.lojas && roteiro.lojas.length > 0 ? (
              roteiro.lojas.map((loja) => (
                <button
                  key={loja.id}
                  onClick={() => setLojaSelecionada(loja)}
                  className={`p-4 rounded-lg shadow border-2 font-bold text-lg transition-all flex flex-col items-start 
                    ${lojaSelecionada?.id === loja.id ? "border-blue-600" : "border-transparent"}
                    ${loja.status === "finalizado" ? "bg-green-100 border-green-600 text-green-700" : "bg-white"}`}
                >
                  <span>🏪 {loja.nome}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    {loja.cidade}, {loja.estado}
                  </span>
                  {loja.status === "finalizado" && (
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-semibold">Finalizada</span>
                  )}
                </button>
              ))
            ) : (
              <div className="col-span-2 text-center text-gray-400">
                Nenhuma loja disponível neste roteiro.
              </div>
            )}
          </div>
        </div>
        {lojaSelecionada && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">
              Máquinas da loja: {lojaSelecionada.nome}
            </h3>
            <div className="space-y-3">
              {lojaSelecionada.maquinas &&
              lojaSelecionada.maquinas.length > 0 ? (
                lojaSelecionada.maquinas.map((maquina) => (
                  <button
                    key={maquina.id}
                    className={`p-3 rounded border font-medium w-full text-left transition-all flex items-center gap-2 
                      ${maquina.status === "finalizado" ? "bg-green-100 border-green-600 text-green-700" : "bg-gray-50 hover:border-blue-600"}`}
                    onClick={() =>
                      navigate(
                        `/roteiros/${roteiro.id}/lojas/${lojaSelecionada.id}/maquinas/${maquina.id}/movimentacao`,
                      )
                    }
                  >
                    <span>🖲️ {maquina.nome}</span>
                    <span className="text-xs text-gray-500 ml-2">({maquina.tipo})</span>
                    {maquina.status === "finalizado" && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-semibold">Finalizada</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-gray-400">
                  Nenhuma máquina cadastrada nesta loja.
                </div>
              )}
            </div>
          </div>
        )}
        <button
          className="bg-gray-200 text-gray-700 py-2 px-6 rounded-lg font-bold"
          onClick={() => navigate(-1)}
        >
          Voltar
        </button>
      </main>
      <Footer />
    </div>
  );
}
