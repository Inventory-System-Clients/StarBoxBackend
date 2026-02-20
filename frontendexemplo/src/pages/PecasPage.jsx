
import React, { useState } from "react";
import { pecasExemplo } from "./pecasData";
import { useAuth } from "../contexts/AuthContext.jsx";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer.jsx";

export default function PecasPage() {
  const { usuario } = useAuth();
  const [pecas, setPecas] = useState(pecasExemplo);
  const [carrinho, setCarrinho] = useState([]);

  // Adiciona peça ao carrinho do usuário
  const adicionarAoCarrinho = (peca) => {
    setCarrinho((prev) => {
      const jaNoCarrinho = prev.find((item) => item.id === peca.id);
      if (jaNoCarrinho) {
        return prev.map((item) =>
          item.id === peca.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { ...peca, quantidade: 1 }];
    });
  };

  // Remove peça do carrinho do usuário
  const removerDoCarrinho = (pecaId) => {
    setCarrinho((prev) => prev.filter((item) => item.id !== pecaId));
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          🛠️ Peças
        </h1>
        <p className="text-gray-600 mb-4">
          Aqui você pode visualizar, cadastrar e gerenciar peças do estoque. Funcionários de manutenção podem adicionar peças ao carrinho para uso em roteiros.
        </p>

        <div className="overflow-x-auto bg-white rounded-xl shadow p-4 border border-gray-100 mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                {(usuario?.role === "MANUTENCAO" || usuario?.role === "ADMIN" || usuario?.role === "GERENCIADOR") && (
                  <th className="px-4 py-2"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pecas.map((peca) => (
                <tr key={peca.id}>
                  <td className="px-4 py-2 font-semibold text-gray-800">{peca.nome}</td>
                  <td className="px-4 py-2 text-gray-700">{peca.categoria}</td>
                  <td className="px-4 py-2 text-gray-700">{peca.quantidade}</td>
                  {(usuario?.role === "MANUTENCAO" || usuario?.role === "ADMIN" || usuario?.role === "GERENCIADOR") && (
                    <td className="px-4 py-2">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
                        onClick={() => adicionarAoCarrinho(peca)}
                      >
                        Adicionar ao Carrinho
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Carrinho do usuário */}
        {(usuario?.role === "MANUTENCAO" || usuario?.role === "ADMIN" || usuario?.role === "GERENCIADOR") && (
          <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🛒 Meu Carrinho</h2>
            {carrinho.length === 0 ? (
              <p className="text-gray-500">Nenhuma peça no carrinho.</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {carrinho.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-semibold text-gray-800">{item.nome}</td>
                      <td className="px-4 py-2 text-gray-700">{item.categoria}</td>
                      <td className="px-4 py-2 text-gray-700">{item.quantidade}</td>
                      <td className="px-4 py-2">
                        <button
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs font-semibold"
                          onClick={() => removerDoCarrinho(item.id)}
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
