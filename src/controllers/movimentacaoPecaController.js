import { MovimentacaoPeca, Peca } from "../models/index.js";

// Registrar peças usadas em uma movimentação
export const registrarMovimentacaoPecas = async (movimentacaoId, pecasUsadas = []) => {
  if (!pecasUsadas || pecasUsadas.length === 0) return;
  for (const peca of pecasUsadas) {
    let nomePeca = peca.nome;
    if (!nomePeca) {
      const pecaDb = await Peca.findByPk(peca.pecaId);
      nomePeca = pecaDb ? pecaDb.nome : null;
    }
    await MovimentacaoPeca.create({
      movimentacaoId,
      pecaId: peca.pecaId,
      quantidade: peca.quantidade,
      nome: nomePeca,
    });
  }
};

// Listar peças usadas em uma movimentação
export const listarMovimentacaoPecas = async (movimentacaoId) => {
  const itens = await MovimentacaoPeca.findAll({
    where: { movimentacaoId },
    include: [{ model: Peca }],
  });
  return itens.map(item => ({
    id: item.id,
    movimentacaoId: item.movimentacaoId,
    pecaId: item.pecaId,
    quantidade: item.quantidade,
    nome: item.nome || (item.Peca ? item.Peca.nome : null),
  }));
};
