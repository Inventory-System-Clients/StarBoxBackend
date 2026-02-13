import MovimentacaoEstoqueLoja from "../models/MovimentacaoEstoqueLoja.js";
import MovimentacaoEstoqueLojaProduto from "../models/MovimentacaoEstoqueLojaProduto.js";
import { Loja, Usuario, Produto } from "../models/index.js";

// Listar todas as movimentações de estoque de loja
export const listarMovimentacoesEstoqueLoja = async (req, res) => {
  try {
    const movimentacoes = await MovimentacaoEstoqueLoja.findAll({
      order: [["dataMovimentacao", "DESC"]],
      include: [
        { model: Loja, as: "loja", attributes: ["id", "nome"] },
        { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
        {
          model: MovimentacaoEstoqueLojaProduto,
          as: "produtosEnviados",
          include: [
            { model: Produto, as: "produto", attributes: ["id", "nome"] },
          ],
        },
      ],
    });
    res.json(movimentacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar movimentações" });
  }
};

// Criar nova movimentação
export const criarMovimentacaoEstoqueLoja = async (req, res) => {
  try {
    const { lojaId, produtos, observacao, dataMovimentacao } = req.body;
    // usuarioId será preenchido automaticamente pelo middleware de autenticação
    const usuarioId = req.usuario?.id;

    console.log("[DEBUG] Payload recebido:", req.body);

    // 1. Validação
    if (!lojaId || !Array.isArray(produtos) || produtos.length === 0) {
      console.error("[ERRO] Loja ou produtos ausentes", { lojaId, produtos });
      return res
        .status(400)
        .json({ error: "Loja e Produtos são obrigatórios." });
    }

    // 2. Criar a Movimentação (Header)
    const movimentacao = await MovimentacaoEstoqueLoja.create({
      lojaId,
      usuarioId,
      observacao,
      dataMovimentacao: dataMovimentacao || new Date(),
    });

    console.log("[DEBUG] Movimentacao criada ID:", movimentacao.id);

    // 3. Salvar produtos enviados (Itens) e atualizar estoque
    const { EstoqueLoja } = await import("../models/index.js");
    for (const [idx, item] of produtos.entries()) {
      try {
        await MovimentacaoEstoqueLojaProduto.create({
          movimentacaoEstoqueLojaId: movimentacao.id,
          produtoId: item.produtoId,
          quantidade: Number(item.quantidade),
          tipoMovimentacao: item.tipoMovimentacao || "saida",
        });

        // Atualizar estoque da loja
        const estoque = await EstoqueLoja.findOne({
          where: { lojaId, produtoId: item.produtoId },
        });
        let novaQuantidade = 0;
        if (estoque) {
          console.log(
            `[ESTOQUE] Antes: lojaId=${lojaId}, produtoId=${item.produtoId}, quantidadeAtual=${estoque.quantidade}`
          );
          if ((item.tipoMovimentacao || "saida") === "entrada") {
            novaQuantidade = estoque.quantidade + Number(item.quantidade);
          } else {
            novaQuantidade = estoque.quantidade - Number(item.quantidade);
            if (novaQuantidade < 0) novaQuantidade = 0;
          }
          await estoque.update({ quantidade: novaQuantidade });
          console.log(
            `[ESTOQUE] Depois: lojaId=${lojaId}, produtoId=${item.produtoId}, novaQuantidade=${novaQuantidade}`
          );
        } else {
          // Se não existe, cria novo registro de estoque
          novaQuantidade =
            (item.tipoMovimentacao || "saida") === "entrada"
              ? Number(item.quantidade)
              : 0;
          await EstoqueLoja.create({
            lojaId,
            produtoId: item.produtoId,
            quantidade: novaQuantidade,
          });
          console.log(
            `[ESTOQUE] Criado novo estoque: lojaId=${lojaId}, produtoId=${item.produtoId}, quantidade=${novaQuantidade}`
          );
        }
      } catch (err) {
        console.error(`[ERRO] Falha ao criar produto idx ${idx}:`, item, err);
      }
    }

    // 4. Retornar movimentação completa com os produtos inclusos
    const movimentacaoCompleta = await MovimentacaoEstoqueLoja.findByPk(
      movimentacao.id,
      {
        include: [
          { model: Loja, as: "loja", attributes: ["id", "nome"] },
          { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
          {
            model: MovimentacaoEstoqueLojaProduto,
            as: "produtosEnviados",
            include: [
              { model: Produto, as: "produto", attributes: ["id", "nome"] },
            ],
          },
        ],
      }
    );

    return res.status(201).json(movimentacaoCompleta);
  } catch (err) {
    console.error("[ERRO] Exception geral ao criar movimentação:", err);
    return res.status(500).json({
      error: "Erro interno ao criar movimentação",
      details: err.message,
    });
  }
};

// Editar movimentação
export const editarMovimentacaoEstoqueLoja = async (req, res) => {
  try {
    const { id } = req.params;
    const { lojaId, usuarioId, produtos, observacao, dataMovimentacao } =
      req.body;

    const movimentacao = await MovimentacaoEstoqueLoja.findByPk(id);

    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    // Atualiza campos
    movimentacao.lojaId = lojaId || movimentacao.lojaId;
    movimentacao.usuarioId = usuarioId || movimentacao.usuarioId;
    movimentacao.observacao = observacao || movimentacao.observacao;
    movimentacao.dataMovimentacao =
      dataMovimentacao || movimentacao.dataMovimentacao;

    // Se seu model tiver timestamps automáticos, não precisa desta linha:
    // movimentacao.atualizadoEm = new Date();

    await movimentacao.save();

    // Atualizar produtos enviados (Remove antigos e cria novos)
    if (Array.isArray(produtos)) {
      // Buscar produtos antigos antes de remover
      const produtosAntigos = await MovimentacaoEstoqueLojaProduto.findAll({
        where: { movimentacaoEstoqueLojaId: movimentacao.id },
      });

      await MovimentacaoEstoqueLojaProduto.destroy({
        where: { movimentacaoEstoqueLojaId: movimentacao.id },
      });

      // Mapear produtos antigos por produtoId para fácil acesso
      const mapAntigos = {};
      for (const prod of produtosAntigos) {
        mapAntigos[prod.produtoId] = prod;
      }

      // Atualizar/ajustar estoque da loja para cada produto
      const { EstoqueLoja } = await import("../models/index.js");
      for (const item of produtos) {
        await MovimentacaoEstoqueLojaProduto.create({
          movimentacaoEstoqueLojaId: movimentacao.id,
          produtoId: item.produtoId,
          quantidade: Number(item.quantidade),
          tipoMovimentacao: item.tipoMovimentacao || "saida",
        });

        // Ajuste de estoque considerando tipo antigo e novo
        const antigo = mapAntigos[item.produtoId];
        const quantidadeAntiga = antigo ? Number(antigo.quantidade) : 0;
        const tipoAntigo = antigo
          ? antigo.tipoMovimentacao
          : item.tipoMovimentacao || "saida";
        const quantidadeNova = Number(item.quantidade);
        const tipoNovo = item.tipoMovimentacao || "saida";

        // Buscar estoque atual
        const estoque = await EstoqueLoja.findOne({
          where: { lojaId: movimentacao.lojaId, produtoId: item.produtoId },
        });
        if (estoque) {
          let novaQuantidade = estoque.quantidade;
          // Reverte o efeito do antigo
          if (tipoAntigo === "entrada") {
            novaQuantidade -= quantidadeAntiga;
          } else {
            novaQuantidade += quantidadeAntiga;
          }
          // Aplica o efeito do novo
          if (tipoNovo === "entrada") {
            novaQuantidade += quantidadeNova;
          } else {
            novaQuantidade -= quantidadeNova;
          }
          if (novaQuantidade < 0) novaQuantidade = 0;
          await estoque.update({ quantidade: novaQuantidade });
        } else {
          // Se não existe, cria novo registro de estoque
          let novaQuantidade = 0;
          if (tipoNovo === "entrada") {
            novaQuantidade = quantidadeNova;
          } else {
            novaQuantidade = 0;
          }
          await EstoqueLoja.create({
            lojaId: movimentacao.lojaId,
            produtoId: item.produtoId,
            quantidade: novaQuantidade,
          });
        }
      }
    }

    // Retornar movimentação completa
    const movimentacaoCompleta = await MovimentacaoEstoqueLoja.findByPk(
      movimentacao.id,
      {
        include: [
          { model: Loja, as: "loja", attributes: ["id", "nome"] },
          { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
          {
            model: MovimentacaoEstoqueLojaProduto,
            as: "produtosEnviados",
            include: [
              { model: Produto, as: "produto", attributes: ["id", "nome"] },
            ],
          },
        ],
      }
    );

    return res.json(movimentacaoCompleta);
  } catch (error) {
    console.error("Erro ao editar:", error);
    return res.status(500).json({ error: "Erro ao editar movimentação" });
  }
};

// Deletar movimentação
export const deletarMovimentacaoEstoqueLoja = async (req, res) => {
  try {
    const { id } = req.params;
    const movimentacao = await MovimentacaoEstoqueLoja.findByPk(id);
    if (!movimentacao) {
      return res.status(404).json({ error: "Movimentação não encontrada" });
    }

    // Buscar todos os produtos associados à movimentação
    const produtosMovimentados = await MovimentacaoEstoqueLojaProduto.findAll({
      where: { movimentacaoEstoqueLojaId: movimentacao.id },
    });

    // Atualizar o estoque da loja para cada produto
    const { EstoqueLoja } = await import("../models/index.js");
    for (const item of produtosMovimentados) {
      const estoque = await EstoqueLoja.findOne({
        where: { lojaId: movimentacao.lojaId, produtoId: item.produtoId },
      });
      if (estoque) {
        let novaQuantidade = estoque.quantidade;
        if ((item.tipoMovimentacao || "saida") === "entrada") {
          // Se era uma entrada, ao deletar deve subtrair do estoque
          novaQuantidade = estoque.quantidade - item.quantidade;
        } else {
          // Se era uma saída, ao deletar deve somar de volta ao estoque
          novaQuantidade = estoque.quantidade + item.quantidade;
        }
        if (novaQuantidade < 0) novaQuantidade = 0;
        await estoque.update({ quantidade: novaQuantidade });
      }
    }

    // Remove os produtos associados
    await MovimentacaoEstoqueLojaProduto.destroy({
      where: { movimentacaoEstoqueLojaId: movimentacao.id },
    });

    // Remove a movimentação
    await movimentacao.destroy();

    return res.json({ message: "Movimentação excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir:", error);
    return res.status(500).json({ error: "Erro ao excluir movimentação" });
  }
};
