import { EstoqueLoja, Loja, Produto } from "../models/index.js";
import AlertManager from "../services/alertManager.js";

const dispararAlertaEstoqueCriticoLoja = async ({
  loja,
  produto,
  estoque,
  usuarioNome,
}) => {
  const minimoDefinido = Number(
    estoque?.estoqueMinimo ?? produto?.estoqueMinimo ?? 0,
  );
  const quantidadeAtual = Number(estoque?.quantidade || 0);

  if (quantidadeAtual > minimoDefinido) {
    return;
  }

  const destinatario = loja?.telefone || process.env.WHATSAPP_ALERT_DESTINO;
  if (!destinatario) {
    return;
  }

  await AlertManager.estoqueCritico({
    nomeUsuario: usuarioNome || "Sistema",
    telefoneChefe: destinatario,
    nomeMaquina: `Estoque da loja ${loja?.nome || loja?.id || "Nao informado"}`,
    produto: produto?.nome || "Produto nao informado",
    quantidadeAtual,
    estoqueMinimo: minimoDefinido,
    referenciaTipo: "estoque_loja",
    referenciaId: estoque?.id,
  });
};

// Listar estoque de uma loja
export const listarEstoqueLoja = async (req, res) => {
  try {
    const { lojaId } = req.params;

    const estoque = await EstoqueLoja.findAll({
      where: { lojaId },
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(estoque);
  } catch (error) {
    console.error("Erro ao listar estoque da loja:", error);
    res.status(500).json({ error: "Erro ao listar estoque da loja" });
  }
};

// Atualizar estoque de um produto na loja
export const atualizarEstoqueLoja = async (req, res) => {
  try {
    const { lojaId, produtoId } = req.params;
    const { quantidade, estoqueMinimo } = req.body;

    console.log("🔄 [atualizarEstoqueLoja] Recebendo atualização:", {
      lojaId,
      produtoId,
      quantidade,
      estoqueMinimo,
    });

    if (quantidade === undefined) {
      return res.status(400).json({ error: "Quantidade é obrigatória" });
    }

    if (quantidade < 0) {
      console.log(
        "❌ [atualizarEstoqueLoja] Quantidade negativa rejeitada:",
        quantidade,
      );
      return res
        .status(400)
        .json({ error: "Quantidade não pode ser negativa" });
    }

    // Verificar se loja e produto existem
    const loja = await Loja.findByPk(lojaId);
    if (!loja) {
      console.log("❌ [atualizarEstoqueLoja] Loja não encontrada:", lojaId);
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    const produto = await Produto.findByPk(produtoId);
    if (!produto) {
      console.log(
        "❌ [atualizarEstoqueLoja] Produto não encontrado:",
        produtoId,
      );
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    // Buscar ou criar registro de estoque
    const [estoque, created] = await EstoqueLoja.findOrCreate({
      where: { lojaId, produtoId },
      defaults: {
        quantidade,
        estoqueMinimo: estoqueMinimo !== undefined ? estoqueMinimo : 0,
      },
    });

    console.log("📦 [atualizarEstoqueLoja] Estoque atual:", {
      id: estoque.id,
      quantidadeAtual: estoque.quantidade,
      created,
    });

    if (!created) {
      const quantidadeAnterior = estoque.quantidade;
      // Atualizar se já existe
      estoque.quantidade = quantidade;
      if (estoqueMinimo !== undefined) {
        estoque.estoqueMinimo = estoqueMinimo;
      }
      await estoque.save();

      console.log("✅ [atualizarEstoqueLoja] Estoque atualizado:", {
        quantidadeAnterior,
        quantidadeNova: quantidade,
        diferenca: quantidade - quantidadeAnterior,
      });
    } else {
      console.log("✨ [atualizarEstoqueLoja] Novo estoque criado:", {
        quantidade,
        estoqueMinimo,
      });
    }

    // Retornar com dados do produto
    const estoqueAtualizado = await EstoqueLoja.findByPk(estoque.id, {
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
    });

    dispararAlertaEstoqueCriticoLoja({
      loja,
      produto,
      estoque: estoqueAtualizado,
      usuarioNome: req.usuario?.nome,
    }).catch((erroAlerta) => {
      console.error(
        "Erro ao disparar alerta de estoque (atualizarEstoqueLoja):",
        erroAlerta.message,
      );
    });

    res.json({
      message: created
        ? "Estoque criado com sucesso"
        : "Estoque atualizado com sucesso",
      estoque: estoqueAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar estoque da loja:", error);
    res.status(500).json({ error: "Erro ao atualizar estoque da loja" });
  }
};

// Criar ou atualizar produto único (usado pelo Dashboard)
export const criarOuAtualizarProdutoEstoque = async (req, res) => {
  try {
    const { lojaId } = req.params;
    const { produtoId, quantidade, estoqueMinimo } = req.body;

    console.log("🔄 [criarOuAtualizarProdutoEstoque] Recebendo requisição:", {
      lojaId,
      produtoId,
      quantidade,
      estoqueMinimo,
    });

    if (!produtoId) {
      return res.status(400).json({ error: "produtoId é obrigatório" });
    }

    if (quantidade === undefined) {
      return res.status(400).json({ error: "quantidade é obrigatória" });
    }

    if (quantidade < 0) {
      console.log(
        "❌ [criarOuAtualizarProdutoEstoque] Quantidade negativa rejeitada:",
        quantidade,
      );
      return res
        .status(400)
        .json({ error: "Quantidade não pode ser negativa" });
    }

    // Verificar se loja existe
    const loja = await Loja.findByPk(lojaId);
    if (!loja) {
      console.log(
        "❌ [criarOuAtualizarProdutoEstoque] Loja não encontrada:",
        lojaId,
      );
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Verificar se produto existe
    const produto = await Produto.findByPk(produtoId);
    if (!produto) {
      console.log(
        "❌ [criarOuAtualizarProdutoEstoque] Produto não encontrado:",
        produtoId,
      );
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    // Buscar ou criar registro de estoque
    const [estoque, created] = await EstoqueLoja.findOrCreate({
      where: { lojaId, produtoId },
      defaults: {
        quantidade,
        estoqueMinimo: estoqueMinimo !== undefined ? estoqueMinimo : 0,
      },
    });

    console.log("📦 [criarOuAtualizarProdutoEstoque] Estoque encontrado:", {
      id: estoque.id,
      quantidadeAtual: estoque.quantidade,
      created,
    });

    if (!created) {
      const quantidadeAnterior = estoque.quantidade;
      // Atualizar se já existe
      estoque.quantidade = quantidade;
      if (estoqueMinimo !== undefined) {
        estoque.estoqueMinimo = estoqueMinimo;
      }
      await estoque.save();

      console.log("✅ [criarOuAtualizarProdutoEstoque] Estoque atualizado:", {
        quantidadeAnterior,
        quantidadeNova: quantidade,
        diferenca: quantidade - quantidadeAnterior,
      });
    } else {
      console.log("✨ [criarOuAtualizarProdutoEstoque] Novo estoque criado:", {
        quantidade,
        estoqueMinimo,
      });
    }

    // Retornar com dados do produto
    const estoqueAtualizado = await EstoqueLoja.findByPk(estoque.id, {
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji", "estoqueMinimo"],
        },
      ],
    });

    dispararAlertaEstoqueCriticoLoja({
      loja,
      produto,
      estoque: estoqueAtualizado,
      usuarioNome: req.usuario?.nome,
    }).catch((erroAlerta) => {
      console.error(
        "Erro ao disparar alerta de estoque (criarOuAtualizarProdutoEstoque):",
        erroAlerta.message,
      );
    });

    res.json({
      message: created
        ? "Estoque criado com sucesso"
        : "Estoque atualizado com sucesso",
      estoque: estoqueAtualizado,
    });
  } catch (error) {
    console.error("Erro ao criar/atualizar produto no estoque:", error);
    res.status(500).json({ error: "Erro ao processar estoque" });
  }
};

// Atualizar múltiplos produtos de uma vez
export const atualizarVariosEstoques = async (req, res) => {
  try {
    const { lojaId } = req.params;

    console.log("=== ATUALIZAR VÁRIOS ESTOQUES ===");
    console.log("LojaId:", lojaId);
    console.log("req.body completo:", JSON.stringify(req.body, null, 2));

    const { estoques } = req.body; // Array de { produtoId, quantidade, estoqueMinimo }
    console.log("Estoques recebidos:", JSON.stringify(estoques, null, 2));

    if (!Array.isArray(estoques) || estoques.length === 0) {
      return res.status(400).json({ error: "Array de estoques é obrigatório" });
    }

    // Verificar se loja existe
    const loja = await Loja.findByPk(lojaId);
    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    const resultados = [];
    const erros = [];

    for (const item of estoques) {
      const { produtoId, quantidade, estoqueMinimo } = item;

      if (!produtoId || quantidade === undefined) {
        console.log("Item inválido ignorado:", item);
        continue; // Pular itens inválidos
      }

      try {
        // Verificar se produto existe
        const produto = await Produto.findByPk(produtoId);
        if (!produto) {
          console.log(`Produto ${produtoId} não encontrado`);
          erros.push({ produtoId, erro: "Produto não encontrado" });
          continue;
        }

        const [estoque, created] = await EstoqueLoja.findOrCreate({
          where: { lojaId, produtoId },
          defaults: {
            quantidade,
            estoqueMinimo: estoqueMinimo !== undefined ? estoqueMinimo : 0,
          },
        });

        if (!created) {
          estoque.quantidade = quantidade;
          if (estoqueMinimo !== undefined) {
            estoque.estoqueMinimo = estoqueMinimo;
          }
          await estoque.save();
        }

        console.log(`Estoque ${created ? "criado" : "atualizado"}:`, {
          produtoId,
          quantidade: estoque.quantidade,
          estoqueMinimo: estoque.estoqueMinimo,
        });

        resultados.push(estoque);
      } catch (itemError) {
        console.error(`Erro ao processar produto ${produtoId}:`, itemError);
        erros.push({
          produtoId,
          erro: itemError.message || "Erro desconhecido",
        });
      }
    }

    console.log(
      `Processados: ${resultados.length} sucessos, ${erros.length} erros`,
    );

    res.json({
      message: `${resultados.length} estoques atualizados com sucesso`,
      estoques: resultados,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro ao atualizar vários estoques:", error);
    res.status(500).json({
      error: "Erro ao atualizar estoques",
      details: error.message,
    });
  }
};

// Deletar item do estoque
export const deletarEstoqueLoja = async (req, res) => {
  try {
    const { lojaId, produtoId } = req.params;

    const estoque = await EstoqueLoja.findOne({
      where: { lojaId, produtoId },
    });

    if (!estoque) {
      return res.status(404).json({ error: "Estoque não encontrado" });
    }

    await estoque.destroy();

    res.json({ message: "Estoque removido com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar estoque:", error);
    res.status(500).json({ error: "Erro ao deletar estoque" });
  }
};

// Obter alertas de estoque baixo
export const alertasEstoqueLoja = async (req, res) => {
  try {
    const { lojaId } = req.params;

    const estoques = await EstoqueLoja.findAll({
      where: { lojaId },
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["id", "nome", "codigo", "emoji"],
        },
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome"],
        },
      ],
    });

    // Filtrar produtos com estoque baixo
    const alertas = estoques.filter((est) => {
      const minimoDefinido =
        est.estoqueMinimo || est.produto?.estoqueMinimo || 0;
      return est.quantidade <= minimoDefinido;
    });

    res.json({
      total: alertas.length,
      alertas: alertas.map((a) => ({
        produto: a.produto,
        quantidade: a.quantidade,
        estoqueMinimo: a.estoqueMinimo,
        loja: a.loja,
      })),
    });
  } catch (error) {
    console.error("Erro ao buscar alertas de estoque:", error);
    res.status(500).json({ error: "Erro ao buscar alertas" });
  }
};
