import api from "../services/api";
import React, { useEffect, useState } from "react";

const nivelCor = {
  danger: "bg-[#733D38] text-white border-[#A6806A]",
  warning: "bg-[#62A1D9] text-white border-[#24094E]",
  info: "bg-[#A6806A] text-white border-[#733D38]",
};

export default function AlertasVeiculos() {
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Definimos a função DENTRO do useEffect para evitar problemas de dependência
    const fetchAlertas = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/alertas-veiculos");
        // Adiciona lógica extra de alertas
        let alertasCompletos = [...data];
        if (Array.isArray(data)) {
          data.forEach((alerta) => {
            // Alerta se o estado da moto não for 'bom'
            if (alerta.estado && alerta.estado.toLowerCase() !== "bom") {
              alertasCompletos.push({
                id: `estado-${alerta.id || alerta.veiculo}`,
                veiculo: alerta.veiculo,
                mensagem: `Atenção: o estado da moto está como '${alerta.estado}'.`,
                nivel: "danger",
              });
            }
            // Alerta de revisão a cada 1000 km
            if (alerta.km && Number.isFinite(Number(alerta.km))) {
              const km = Number(alerta.km);
              if (km >= 1000 && km % 1000 === 0) {
                alertasCompletos.push({
                  id: `revisao-${alerta.id || alerta.veiculo}-${km}`,
                  veiculo: alerta.veiculo,
                  mensagem: `Moto atingiu ${km} km: necessário realizar revisão!`,
                  nivel: "warning",
                });
              }
            }
          });
        }
        setAlertas(alertasCompletos);
      } catch (error) {
        console.error("Erro ao buscar alertas:", error);
        setAlertas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertas();
  }, []); // O array vazio [] garante que rode apenas uma vez ao montar

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-2">Alertas de Veículos</h2>
      {loading ? (
        <div className="text-gray-500">Carregando alertas...</div>
      ) : alertas.length === 0 ? (
        <div className="text-gray-500">
          Nenhum alerta de veículo no momento.
        </div>
      ) : (
        <ul className="space-y-2">
          {alertas.map((alerta, idx) => (
            <li
              key={alerta.id || idx}
              className={`border-l-4 p-3 rounded ${
                nivelCor[alerta.nivel] ||
                "bg-gray-100 text-gray-800 border-gray-300"
              }`}
            >
              <span className="font-semibold">{alerta.veiculo}:</span>{" "}
              {alerta.mensagem}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
