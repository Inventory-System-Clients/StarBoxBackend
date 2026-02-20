import React from "react";

import api from "../services/api";

export default function TabelaMovimentacoesEstoqueDeLoja({
  movimentacoesEstoqueLoja = [],
  lojas = [],
  filtroLojaEstoque = "",
  filtroDataEstoque = "",
  filtroResponsavelEstoque = "",
  setEditandoEstoqueLoja,
  setExcluindoEstoqueLoja,
  onChangeEstoqueLoja, // Função para recarregar estoque consolidado
}) {
  // Função para deletar movimentação e recarregar estoque consolidado
  const handleDelete = async (mov) => {
    if (!window.confirm("Tem certeza que deseja deletar esta movimentação?"))
      return;
    try {
      await api.delete(`/movimentacao-estoque-loja/${mov.id}`);
      if (typeof onChangeEstoqueLoja === "function") onChangeEstoqueLoja();
    } catch (err) {
      alert("Erro ao deletar movimentação de estoque de loja.");
    }
  };

  // Função para editar movimentação (apenas abre modal, recarrega estoque deve ser feito após salvar no modal principal)

  return (
    <div className="overflow-x-auto rounded-xl border border-[#62A1D9] bg-white">
      <table className="min-w-full table-auto text-[#24094E]">
        <thead>
          <tr className="bg-[#62A1D9] text-white">
            <th className="px-4 py-2">Data/Hora</th>
            <th className="px-4 py-2">Loja de Destino</th>
            <th className="px-4 py-2">Responsável</th>
            <th className="px-4 py-2">Produtos Enviados</th>
            <th className="px-4 py-2">Editar</th>
            <th className="px-4 py-2">Deletar</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoesEstoqueLoja
            .filter(
              (mov) =>
                (!filtroLojaEstoque || mov.loja?.id === filtroLojaEstoque) &&
                (!filtroResponsavelEstoque ||
                  (mov.usuario?.nome &&
                    mov.usuario.nome
                      .toLowerCase()
                      .includes(filtroResponsavelEstoque.toLowerCase()))) &&
                (!filtroDataEstoque ||
                  (mov.dataMovimentacao &&
                    mov.dataMovimentacao.startsWith(filtroDataEstoque))),
            )
            .map((mov) => (
              <tr key={mov.id} className="border-b">
                <td className="px-4 py-2">
                  {mov.dataMovimentacao
                    ? new Date(mov.dataMovimentacao).toLocaleString("pt-BR")
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  {mov.loja?.nome || mov.lojaId || "-"}
                </td>
                <td className="px-4 py-2">{mov.usuario?.nome || "-"}</td>
                <td className="px-4 py-2">
                  {mov.produtosEnviados && mov.produtosEnviados.length > 0 ? (
                    <ul className="list-disc ml-4">
                      {mov.produtosEnviados.map((prod) => (
                        <li key={prod.id}>
                          {prod.produto?.nome || prod.produtoId} —
                          <span className="font-bold">{prod.quantidade}</span>{" "}
                          <span
                            className={
                              prod.tipoMovimentacao === "entrada"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            [{prod.tipoMovimentacao}]
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2">
                  <button
                    className="bg-[#62A1D9] hover:bg-[#24094E] text-white font-semibold px-3 py-1 rounded transition"
                    onClick={() => setEditandoEstoqueLoja(mov)}
                  >
                    Editar
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    className="bg-[#733D38] hover:bg-[#A6806A] text-white px-3 py-1 rounded transition"
                    onClick={() => handleDelete(mov)}
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
