import React, { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function RegistroVeiculos({ veiculos = [], loading }) {
  const { usuario } = useContext(AuthContext);
  if (!usuario || usuario.role !== "ADMIN") return null;
  if (loading) return <div className="p-6">Carregando veículos...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4 text-[#24094E]">
        Registro de Veículos
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-[#62A1D9] rounded-lg text-[#24094E]">
          <thead>
            <tr className="bg-[#62A1D9] text-white">
              <th className="px-4 py-2 border">Veículo</th>
              <th className="px-4 py-2 border">Km</th>
              <th className="px-4 py-2 border">Estado</th>
              <th className="px-4 py-2 border">Limpeza</th>
              <th className="px-4 py-2 border">Modo</th>
              <th className="px-4 py-2 border">Combustível</th>
            </tr>
          </thead>
          <tbody>
            {veiculos.map((registro) => (
              <tr key={registro.id} className="text-center">
                <td className="px-4 py-2 border">{registro.nome}</td>
                <td className="px-4 py-2 border">{registro.km}</td>
                <td className="px-4 py-2 border">{registro.estado}</td>
                <td className="px-4 py-2 border">
                  {registro.nivelLimpeza || registro.limpeza}
                </td>
                <td className="px-4 py-2 border">{registro.modo}</td>
                <td className="px-4 py-2 border">
                  {registro.nivelCombustivel || registro.combustivel}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
