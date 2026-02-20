import AlertAdmin from "../components/AlertAdmin";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export default function Alertas() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background-light bg-pattern teddy-pattern py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          className="mb-8 px-6 py-2 rounded-lg bg-yellow-200 text-yellow-900 font-bold shadow hover:bg-yellow-300 transition-colors flex items-center gap-2"
          onClick={() => navigate("/")}
        >
          <span className="text-xl">←</span> Voltar para o Dashboard
        </button>
        <h1 className="text-5xl font-extrabold text-yellow-700 mb-10 text-center drop-shadow-lg">
          ⚠️ Alertas de Movimentação Inconsistente
        </h1>
        {/* Seção detalhada dos alertas de movimentação inconsistentes */}
        {usuario?.role === "ADMIN" && (
          <div id="alertas-movimentacao-inconsistente" className="mb-8">
            <AlertAdmin />
          </div>
        )}
      </div>
    </div>
  );
}
