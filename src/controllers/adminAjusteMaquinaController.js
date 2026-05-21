import { Maquina, Movimentacao, Loja } from "../models/index.js";

const possuiValor = (valor) => valor !== undefined;

const inteiroNaoNegativo = (valor, campo) => {
  if (!possuiValor(valor)) {
    return { presente: false, valor: null };
  }

  if (valor === null || valor === "") {
    return {
      presente: true,
      erro: `${campo} deve ser informado como numero inteiro maior ou igual a zero`,
    };
  }

  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 0) {
    return {
      presente: true,
      erro: `${campo} deve ser um numero inteiro maior ou igual a zero`,
    };
  }

  return { presente: true, valor: numero };
};

const buscarMaquinaComLoja = async ({ maquinaId, lojaId, transaction } = {}) => {
  const maquina = await Maquina.findByPk(maquinaId, {
    include: [
      {
        model: Loja,
        as: "loja",
        attributes: ["id", "nome", "cidade"],
      },
    ],
    transaction,
  });

  if (!maquina) {
    return { status: 404, error: "Maquina nao encontrada" };
  }

  if (lojaId && maquina.lojaId !== lojaId) {
    return {
      status: 400,
      error: "A maquina selecionada nao pertence a loja informada",
    };
  }

  return { maquina };
};

const buscarUltimaMovimentacaoDaMaquina = async ({ maquinaId, transaction }) => {
  return Movimentacao.findOne({
    where: { maquinaId },
    order: [
      ["dataColeta", "DESC"],
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    transaction,
  });
};

const montarRespostaAjusteAtual = ({ maquina, movimentacao, anteriores }) => ({
  maquina: {
    id: maquina.id,
    codigo: maquina.codigo,
    nome: maquina.nome,
    lojaId: maquina.lojaId,
    capacidadePadrao: maquina.capacidadePadrao,
  },
  loja: maquina.loja
    ? {
        id: maquina.loja.id,
        nome: maquina.loja.nome,
        cidade: maquina.loja.cidade,
      }
    : null,
  valoresAtuais: {
    quantidadeAtual: Number(movimentacao.totalPos || 0),
    contadorIn: movimentacao.contadorIn,
    contadorOut: movimentacao.contadorOut,
    ultimaAtualizacao: movimentacao.dataColeta,
    atualizadoEm: movimentacao.updatedAt,
  },
  valoresAnteriores: anteriores || null,
  camposEditaveis: ["quantidadeAtual", "contadorIn", "contadorOut"],
});

export const obterAjusteAtualMaquina = async (req, res) => {
  try {
    const { maquinaId } = req.params;
    const { lojaId } = req.query;

    const resultadoMaquina = await buscarMaquinaComLoja({ maquinaId, lojaId });
    if (resultadoMaquina.error) {
      return res
        .status(resultadoMaquina.status)
        .json({ error: resultadoMaquina.error });
    }

    const movimentacao = await buscarUltimaMovimentacaoDaMaquina({
      maquinaId,
    });

    if (!movimentacao) {
      return res.status(404).json({
        error: "Esta maquina ainda nao possui valores atuais para editar",
        code: "MAQUINA_SEM_VALORES_ATUAIS",
      });
    }

    return res.json(
      montarRespostaAjusteAtual({
        maquina: resultadoMaquina.maquina,
        movimentacao,
      }),
    );
  } catch (error) {
    console.error("[obterAjusteAtualMaquina] Erro:", error);
    return res.status(500).json({
      error: "Erro ao carregar valores atuais da maquina",
    });
  }
};

export const atualizarAjusteAtualMaquina = async (req, res) => {
  let transaction = null;

  try {
    const { maquinaId } = req.params;
    const { lojaId, quantidadeAtual, contadorIn, contadorOut } = req.body;

    const quantidadeAtualNormalizada = inteiroNaoNegativo(
      quantidadeAtual,
      "quantidadeAtual",
    );
    const contadorInNormalizado = inteiroNaoNegativo(contadorIn, "contadorIn");
    const contadorOutNormalizado = inteiroNaoNegativo(
      contadorOut,
      "contadorOut",
    );

    const erroValidacao =
      quantidadeAtualNormalizada.erro ||
      contadorInNormalizado.erro ||
      contadorOutNormalizado.erro;

    if (erroValidacao) {
      return res.status(400).json({ error: erroValidacao });
    }

    if (
      !quantidadeAtualNormalizada.presente &&
      !contadorInNormalizado.presente &&
      !contadorOutNormalizado.presente
    ) {
      return res.status(400).json({
        error:
          "Informe pelo menos um campo para atualizar: quantidadeAtual, contadorIn ou contadorOut",
      });
    }

    transaction = await Movimentacao.sequelize.transaction();

    const resultadoMaquina = await buscarMaquinaComLoja({
      maquinaId,
      lojaId,
      transaction,
    });

    if (resultadoMaquina.error) {
      await transaction.rollback();
      transaction = null;
      return res
        .status(resultadoMaquina.status)
        .json({ error: resultadoMaquina.error });
    }

    const movimentacao = await buscarUltimaMovimentacaoDaMaquina({
      maquinaId,
      transaction,
    });

    if (!movimentacao) {
      await transaction.rollback();
      transaction = null;
      return res.status(404).json({
        error: "Esta maquina ainda nao possui valores atuais para editar",
        code: "MAQUINA_SEM_VALORES_ATUAIS",
      });
    }

    const anteriores = {
      quantidadeAtual: Number(movimentacao.totalPos || 0),
      contadorIn: movimentacao.contadorIn,
      contadorOut: movimentacao.contadorOut,
    };

    const updateData = {};
    if (quantidadeAtualNormalizada.presente) {
      updateData.totalPos = quantidadeAtualNormalizada.valor;
    }
    if (contadorInNormalizado.presente) {
      updateData.contadorIn = contadorInNormalizado.valor;
    }
    if (contadorOutNormalizado.presente) {
      updateData.contadorOut = contadorOutNormalizado.valor;
    }

    await Movimentacao.update(updateData, {
      where: { id: movimentacao.id },
      hooks: false,
      transaction,
    });

    const movimentacaoAtualizada = await Movimentacao.findByPk(
      movimentacao.id,
      {
        transaction,
      },
    );

    await transaction.commit();
    transaction = null;

    res.locals.entityId = resultadoMaquina.maquina.id;
    return res.json(
      montarRespostaAjusteAtual({
        maquina: resultadoMaquina.maquina,
        movimentacao: movimentacaoAtualizada,
        anteriores,
      }),
    );
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        // Sem acao adicional.
      }
    }

    console.error("[atualizarAjusteAtualMaquina] Erro:", error);
    return res.status(500).json({
      error: "Erro ao atualizar valores atuais da maquina",
    });
  }
};
