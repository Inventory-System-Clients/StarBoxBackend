import { MovimentacaoPeca, Peca } from "../models/index.js";

// Registrar peças usadas em uma movimentação
export const registrarMovimentacaoPecas = async (movimentacaoId, pecasUsadas = []) => {
  if (!pecasUsadas || pecasUsadas.length === 0) return;
  for (const peca of pecasUsadas) {
    await MovimentacaoPeca.create({
      movimentacaoId,
      pecaId: peca.pecaId,
      quantidade: peca.quantidade,
      nome: peca.nome || null,
    });
  }
};

// Listar peças usadas em uma movimentação
export const listarMovimentacaoPecas = async (movimentacaoId) => {
  return MovimentacaoPeca.findAll({
    where: { movimentacaoId },
    include: [{ model: Peca }],
  });
};
