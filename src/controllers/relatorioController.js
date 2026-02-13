// src/controllers/relatorioController.js
import { Sequelize, Op, fn, col } from "sequelize";
import {
  Movimentacao,
  MovimentacaoProduto,
  Maquina,
  Loja,
  Produto,
  AlertaIgnorado,
  RegistroDinheiro,
} from "../models/index.js";

// --- DASHBOARD GERAL ---
export const dashboardRelatorio = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    // 1. Configuração de Datas
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : new Date();
    const inicio = dataInicio
      ? new Date(`${dataInicio}T00:00:00`)
      : new Date(new Date().setDate(fim.getDate() - 30));

    // 2. Filtros
    const whereMovimentacao = {
      dataColeta: { [Op.between]: [inicio, fim] },
    };

    const whereMaquina = {};
    if (lojaId) whereMaquina.lojaId = lojaId;

    // --- QUERY 1: TOTAIS GERAIS ---
    const totaisRaw = await Movimentacao.findAll({
      attributes: [
        [fn("SUM", col("fichas")), "totalFichas"],
        [fn("SUM", col("sairam")), "totalSairam"],
        [fn("SUM", col("valorFaturado")), "faturamentoTotal"],
        [fn("SUM", col("quantidade_notas_entrada")), "dinheiro"],
        [fn("SUM", col("valor_entrada_maquininha_pix")), "pix"],
      ],
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: [],
        },
      ],
      where: whereMovimentacao,
      raw: true,
    });

    const totaisDados = totaisRaw[0] || {};
    const faturamento = parseFloat(totaisDados.faturamentoTotal || 0);
    const saidas = parseInt(totaisDados.totalSairam || 0);
    const fichas = parseInt(totaisDados.totalFichas || 0);
    const dinheiro = parseFloat(totaisDados.dinheiro || 0);
    const pix = parseFloat(totaisDados.pix || 0);

    // --- QUERY 2: CUSTO TOTAL ---
    const itensVendidos = await MovimentacaoProduto.findAll({
      attributes: ["quantidadeSaiu"],
      include: [
        {
          model: Produto,
          as: "produto",
          attributes: ["custoUnitario"],
        },
        {
          model: Movimentacao,
          attributes: [],
          where: whereMovimentacao,
          include: [
            {
              model: Maquina,
              as: "maquina",
              where: whereMaquina,
              attributes: [],
            },
          ],
        },
      ],
      raw: true,
      nest: true,
    });

    const custoTotal = itensVendidos.reduce((acc, item) => {
      const qtd = item.quantidadeSaiu || 0;
      const custo = parseFloat(item.produto?.custoUnitario || 0);
      return acc + qtd * custo;
    }, 0);

    const lucro = faturamento - custoTotal;

    // --- QUERY 3: GRÁFICO FINANCEIRO ---
    const timelineRaw = await Movimentacao.findAll({
      attributes: [
        [fn("DATE", col("dataColeta")), "data"],
        [fn("SUM", col("valorFaturado")), "faturamento"],
      ],
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: [],
        },
      ],
      where: whereMovimentacao,
      group: [fn("DATE", col("dataColeta"))],
      order: [[fn("DATE", col("dataColeta")), "ASC"]],
      raw: true,
    });

    // --- QUERY 4: PERFORMANCE POR MÁQUINA ---
    const performanceRaw = await Movimentacao.findAll({
      attributes: [
        [col("maquina.nome"), "nome"],
        [fn("SUM", col("valorFaturado")), "faturamento"],
      ],
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: ["id", "nome", "capacidadePadrao"],
        },
      ],
      where: whereMovimentacao,
      group: ["maquina.id", "maquina.nome", "maquina.capacidadePadrao"],
      raw: true,
      nest: true,
    });

    const performanceMaquinas = await Promise.all(
      performanceRaw.map(async (p) => {
        const ultimaMov = await Movimentacao.findOne({
          where: { maquinaId: p.maquina.id },
          order: [["dataColeta", "DESC"]],
          attributes: ["totalPos"],
        });

        const estoqueAtual = ultimaMov ? ultimaMov.totalPos : 0;
        const capacidade = p.maquina.capacidadePadrao || 100;

        return {
          nome: p.maquina.nome,
          faturamento: parseFloat(p.faturamento || 0),
          ocupacao: ((estoqueAtual / capacidade) * 100).toFixed(1),
        };
      }),
    );

    // --- QUERY 5: RANKING DE PRODUTOS ---
    const rankingRaw = await MovimentacaoProduto.findAll({
      attributes: [
        [col("produto.nome"), "nome"],
        [fn("SUM", col("quantidadeSaiu")), "quantidade"],
      ],
      include: [
        { model: Produto, as: "produto", attributes: ["id", "nome"] },
        {
          model: Movimentacao,
          attributes: [],
          where: whereMovimentacao,
          include: [
            {
              model: Maquina,
              as: "maquina",
              where: whereMaquina,
              attributes: [],
            },
          ],
        },
      ],
      group: ["produto.id", "produto.nome"],
      order: [[fn("SUM", col("quantidadeSaiu")), "DESC"]],
      limit: 10,
      raw: true,
    });

    const rankingProdutos = rankingRaw.map((r) => ({
      nome: r.nome || "Desconhecido",
      quantidade: parseInt(r.quantidade || 0),
    }));

    // --- RESPOSTA FINAL ---
    res.json({
      totais: {
        faturamento,
        lucro,
        saidas,
        fichas,
        dinheiro,
        pix,
      },
      graficoFinanceiro: timelineRaw.map((t) => ({
        data: t.data,
        faturamento: parseFloat(t.faturamento || 0),
        custo: 0,
      })),
      performanceMaquinas,
      rankingProdutos,
    });
  } catch (error) {
    console.error("Erro Crítico no Dashboard:", error);
    res.status(500).json({
      error: "Erro interno ao processar dashboard.",
      details: error.message,
    });
  }
};

// --- ALERTAS DE INCONSISTÊNCIA (CORRIGIDO) ---
export const buscarAlertasDeInconsistencia = async (req, res) => {
  console.log("--- INICIANDO ALERTAS DE INCONSISTÊNCIA ---");
  try {
    // const usuarioId = req.usuario?.id; // Pode ser usado se necessário no futuro
    const maquinas = await Maquina.findAll({ where: { ativo: true } });
    const alertas = [];

    // Buscar alertas ignorados globalmente
    const ignorados = await AlertaIgnorado.findAll();
    const ignoradosSet = new Set(ignorados.map((a) => a.alertaId));

    for (const maquina of maquinas) {
      // Busca as duas últimas movimentações da máquina
      const movimentacoes = await Movimentacao.findAll({
        where: { maquinaId: maquina.id },
        order: [["dataColeta", "DESC"]],
        limit: 2,
        attributes: [
          "id",
          "contadorIn",
          "contadorOut",
          "fichas",
          "sairam",
          "dataColeta",
        ],
      });

      // CORREÇÃO APLICADA AQUI:
      // Se não houver pelo menos 2 movimentações, pula esta máquina.
      if (!movimentacoes || movimentacoes.length < 2) {
        continue;
      }

      const atual = movimentacoes[0]; // mais recente
      const anterior = movimentacoes[1];

      // OUT: diferença do campo contadorOut
      const diffOut = (atual.contadorOut || 0) - (anterior.contadorOut || 0);
      const diffIn = (atual.contadorIn || 0) - (anterior.contadorIn || 0);

      const alertaId = `${maquina.id}-${atual.id}`;

      // Pular alertas se a máquina não tem contadores (contador_out é 0 ou null)
      const temContadores =
        atual.contadorOut !== null && atual.contadorOut !== 0;

      // Se a diferença não bate com a quantidade de saída/fichas
      if (
        temContadores &&
        (diffOut !== (atual.sairam || 0) || diffIn !== (atual.fichas || 0)) &&
        !ignoradosSet.has(alertaId)
      ) {
        alertas.push({
          id: alertaId,
          tipo: "inconsistencia_contador",
          maquinaId: maquina.id,
          maquinaNome: maquina.nome,
          contador_out: atual.contadorOut || 0,
          contador_in: atual.contadorIn || 0,
          fichas: atual.fichas,
          sairam: atual.sairam,
          dataMovimentacao: atual.dataColeta,
          mensagem: `Inconsistência detectada: OUT (${diffOut}) esperado ${
            atual.sairam
          }, IN (${diffIn}) esperado ${atual.fichas}.\nOUT registrado: ${
            atual.contadorOut || 0
          } | IN registrado: ${atual.contadorIn || 0} | Fichas: ${
            atual.fichas
          }`,
        });
      }
    }

    res.json({ alertas });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao buscar alertas de movimentação",
      message: error.message,
    });
  }
};

// --- IGNORAR ALERTA ---
export const ignorarAlertaMovimentacao = async (req, res) => {
  try {
    const { id } = req.params; // alertaId
    const usuarioId = req.usuario?.id;
    const { maquinaId } = req.body;
    if (!usuarioId || !maquinaId || !id) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes." });
    }
    await AlertaIgnorado.create({
      alertaId: id,
      maquinaId,
      usuarioId,
    });
    res.json({ success: true });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erro ao ignorar alerta", message: error.message });
  }
};

// --- BALANÇO SEMANAL ---
export const balançoSemanal = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    const fim = dataFim ? new Date(dataFim) : new Date();
    const inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(fim.getTime() - 7 * 24 * 60 * 60 * 1000);

    const whereMovimentacao = {
      dataColeta: {
        [Op.between]: [inicio, fim],
      },
    };

    const includeMaquina = {
      model: Maquina,
      as: "maquina",
      attributes: ["id", "codigo", "lojaId"],
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome"],
        },
      ],
    };

    if (lojaId) {
      includeMaquina.where = { lojaId };
    }

    const movimentacoes = await Movimentacao.findAll({
      where: whereMovimentacao,
      include: [
        includeMaquina,
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "categoria"],
            },
          ],
        },
      ],
    });

    const totais = movimentacoes.reduce(
      (acc, mov) => {
        acc.totalFichas += mov.fichas || 0;
        acc.totalFaturamento += parseFloat(mov.valorFaturado || 0);
        acc.totalSairam += mov.sairam || 0;
        acc.totalAbastecidas += mov.abastecidas || 0;
        return acc;
      },
      {
        totalFichas: 0,
        totalFaturamento: 0,
        totalSairam: 0,
        totalAbastecidas: 0,
      },
    );

    totais.mediaFichasPremio =
      totais.totalSairam > 0
        ? (totais.totalFichas / totais.totalSairam).toFixed(2)
        : 0;

    const produtosMap = {};
    movimentacoes.forEach((mov) => {
      mov.detalhesProdutos?.forEach((dp) => {
        const produtoNome = dp.produto?.nome || "Não especificado";
        if (!produtosMap[produtoNome]) {
          produtosMap[produtoNome] = {
            nome: produtoNome,
            quantidadeSaiu: 0,
            quantidadeAbastecida: 0,
          };
        }
        produtosMap[produtoNome].quantidadeSaiu += dp.quantidadeSaiu || 0;
        produtosMap[produtoNome].quantidadeAbastecida +=
          dp.quantidadeAbastecida || 0;
      });
    });

    const distribuicaoProdutos = Object.values(produtosMap)
      .map((p) => ({
        ...p,
        porcentagem:
          totais.totalSairam > 0
            ? ((p.quantidadeSaiu / totais.totalSairam) * 100).toFixed(2)
            : 0,
      }))
      .sort((a, b) => b.quantidadeSaiu - a.quantidadeSaiu);

    const lojasMap = {};
    movimentacoes.forEach((mov) => {
      const lojaNome = mov.maquina?.loja?.nome || "Não especificado";
      if (!lojasMap[lojaNome]) {
        lojasMap[lojaNome] = {
          nome: lojaNome,
          fichas: 0,
          faturamento: 0,
          sairam: 0,
          abastecidas: 0,
        };
      }
      lojasMap[lojaNome].fichas += mov.fichas || 0;
      lojasMap[lojaNome].faturamento += parseFloat(mov.valorFaturado || 0);
      lojasMap[lojaNome].sairam += mov.sairam || 0;
      lojasMap[lojaNome].abastecidas += mov.abastecidas || 0;
    });

    const distribuicaoLojas = Object.values(lojasMap)
      .map((l) => ({
        ...l,
        mediaFichasPremio: l.sairam > 0 ? (l.fichas / l.sairam).toFixed(2) : 0,
      }))
      .sort((a, b) => b.faturamento - a.faturamento);

    res.json({
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      totais,
      distribuicaoProdutos,
      distribuicaoLojas,
      totalMovimentacoes: movimentacoes.length,
    });
  } catch (error) {
    console.error("Erro ao gerar balanço semanal:", error);
    res.status(500).json({ error: "Erro ao gerar balanço semanal" });
  }
};

// --- ALERTAS DE ESTOQUE ---
export const alertasEstoque = async (req, res) => {
  try {
    const { lojaId } = req.query;
    const whereMaquina = { ativo: true };

    if (lojaId) {
      whereMaquina.lojaId = lojaId;
    }

    const maquinas = await Maquina.findAll({
      where: whereMaquina,
      include: [
        {
          model: Loja,
          as: "loja",
          attributes: ["id", "nome"],
        },
      ],
    });

    const alertas = [];

    for (const maquina of maquinas) {
      const ultimaMovimentacao = await Movimentacao.findOne({
        where: { maquinaId: maquina.id },
        order: [["dataColeta", "DESC"]],
      });

      const estoqueAtual = ultimaMovimentacao ? ultimaMovimentacao.totalPos : 0;
      const estoqueMinimo =
        (maquina.capacidadePadrao * maquina.percentualAlertaEstoque) / 100;
      const percentualAtual = (estoqueAtual / maquina.capacidadePadrao) * 100;

      if (estoqueAtual < estoqueMinimo) {
        alertas.push({
          maquina: {
            id: maquina.id,
            codigo: maquina.codigo,
            nome: maquina.nome,
            loja: maquina.loja?.nome,
          },
          estoqueAtual,
          capacidadePadrao: maquina.capacidadePadrao,
          estoqueMinimo,
          percentualAtual: percentualAtual.toFixed(2),
          percentualAlerta: maquina.percentualAlertaEstoque,
          nivelAlerta:
            percentualAtual < 10
              ? "CRÍTICO"
              : percentualAtual < 20
                ? "ALTO"
                : "MÉDIO",
          ultimaAtualizacao: ultimaMovimentacao?.dataColeta,
        });
      }
    }

    alertas.sort(
      (a, b) => parseFloat(a.percentualAtual) - parseFloat(b.percentualAtual),
    );

    res.json({
      totalAlertas: alertas.length,
      alertas,
    });
  } catch (error) {
    console.error("Erro ao buscar alertas de estoque:", error);
    res.status(500).json({ error: "Erro ao buscar alertas de estoque" });
  }
};

// --- PERFORMANCE MÁQUINAS ---
export const performanceMaquinas = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    const fim = dataFim ? new Date(dataFim) : new Date();
    const inicio = dataInicio
      ? new Date(dataInicio)
      : new Date(fim.getTime() - 30 * 24 * 60 * 60 * 1000);

    const whereMovimentacao = {
      dataColeta: {
        [Op.between]: [inicio, fim],
      },
    };

    const whereMaquina = {};
    if (lojaId) {
      whereMaquina.lojaId = lojaId;
    }

    const performance = await Movimentacao.findAll({
      attributes: [
        "maquinaId",
        [fn("COUNT", col("id")), "totalMovimentacoes"],
        [fn("SUM", col("fichas")), "totalFichas"],
        [fn("SUM", col("valorFaturado")), "totalFaturamento"],
        [fn("SUM", col("sairam")), "totalSairam"],
        [fn("AVG", col("mediaFichasPremio")), "mediaFichasPremioGeral"],
      ],
      where: whereMovimentacao,
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: whereMaquina,
          attributes: ["id", "codigo", "nome", "tipo"],
          include: [
            {
              model: Loja,
              as: "loja",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
      group: ["maquinaId", "maquina.id", "maquina->loja.id"],
      order: [[fn("SUM", col("valorFaturado")), "DESC"]],
    });

    const resultado = performance.map((p) => ({
      maquina: {
        id: p.maquina.id,
        codigo: p.maquina.codigo,
        nome: p.maquina.nome,
        tipo: p.maquina.tipo,
        loja: p.maquina.loja?.nome,
      },
      metricas: {
        totalMovimentacoes: parseInt(p.getDataValue("totalMovimentacoes")),
        totalFichas: parseInt(p.getDataValue("totalFichas") || 0),
        totalFaturamento: parseFloat(p.getDataValue("totalFaturamento") || 0),
        totalSairam: parseInt(p.getDataValue("totalSairam") || 0),
        mediaFichasPremio: parseFloat(
          p.getDataValue("mediaFichasPremioGeral") || 0,
        ).toFixed(2),
      },
    }));

    res.json({
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      performance: resultado,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de performance:", error);
    res.status(500).json({ error: "Erro ao gerar relatório de performance" });
  }
};

// --- RELATÓRIO DE IMPRESSÃO (RESTAURADO E CORRIGIDO) ---
export const relatorioImpressao = async (req, res) => {
  try {
    const { lojaId, dataInicio, dataFim } = req.query;

    if (!lojaId) {
      return res.status(400).json({ error: "lojaId é obrigatório" });
    }

    if (!dataInicio || !dataFim) {
      return res
        .status(400)
        .json({ error: "dataInicio e dataFim são obrigatórios" });
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setHours(23, 59, 59, 999);

    const loja = await Loja.findByPk(lojaId);
    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    // Buscar registros de dinheiro da loja e máquinas
    const registrosDinheiro = await RegistroDinheiro.findAll({
      where: {
        lojaId,
        inicio: { [Op.lte]: fim },
        fim: { [Op.gte]: inicio },
      },
      raw: true,
    });

    // Buscar movimentações normalmente
    const movimentacoes = await Movimentacao.findAll({
      where: {
        dataColeta: {
          [Op.between]: [inicio, fim],
        },
      },
      include: [
        {
          model: Maquina,
          as: "maquina",
          where: { lojaId },
          attributes: ["id", "codigo", "nome"],
        },
        {
          model: MovimentacaoProduto,
          as: "detalhesProdutos",
          include: [
            {
              model: Produto,
              as: "produto",
              attributes: ["id", "nome", "codigo", "emoji"],
            },
          ],
        },
      ],
      order: [["dataColeta", "DESC"]],
    });

    // Consolidar valores de RegistroDinheiro
    let valorTotalLoja = 0;
    let valorDinheiroLoja = 0;
    let valorCartaoPixLoja = 0;
    registrosDinheiro.forEach((r) => {
      if (r.registrarTotalLoja) {
        valorTotalLoja +=
          parseFloat(r.valorDinheiro || 0) + parseFloat(r.valorCartaoPix || 0);
        valorDinheiroLoja += parseFloat(r.valorDinheiro || 0);
        valorCartaoPixLoja += parseFloat(r.valorCartaoPix || 0);
      }
    });

    // Consolidar valores por máquina
    const valoresPorMaquina = {};
    registrosDinheiro.forEach((r) => {
      if (!r.registrarTotalLoja && r.maquinaId) {
        if (!valoresPorMaquina[r.maquinaId])
          valoresPorMaquina[r.maquinaId] = { dinheiro: 0, cartaoPix: 0 };
        valoresPorMaquina[r.maquinaId].dinheiro += parseFloat(
          r.valorDinheiro || 0,
        );
        valoresPorMaquina[r.maquinaId].cartaoPix += parseFloat(
          r.valorCartaoPix || 0,
        );
      }
    });

    // Calcular totais
    const totalFichas = movimentacoes.reduce(
      (sum, m) => sum + (m.fichas || 0),
      0,
    );
    const totalSairam = movimentacoes.reduce(
      (sum, m) => sum + (m.sairam || 0),
      0,
    );
    const totalAbastecidas = movimentacoes.reduce(
      (sum, m) => sum + (m.abastecidas || 0),
      0,
    );

    // Consolidar produtos
    const produtosSairamMap = {};
    const produtosEntraramMap = {};
    const dadosPorMaquina = {};

    movimentacoes.forEach((mov) => {
      // Agregação Global Produtos
      mov.detalhesProdutos?.forEach((mp) => {
        if (mp.quantidadeSaiu > 0) {
          const key = mp.produtoId;
          if (!produtosSairamMap[key]) {
            produtosSairamMap[key] = { produto: mp.produto, quantidade: 0 };
          }
          produtosSairamMap[key].quantidade += mp.quantidadeSaiu;
        }
        if (mp.quantidadeAbastecida > 0) {
          const key = mp.produtoId;
          if (!produtosEntraramMap[key]) {
            produtosEntraramMap[key] = { produto: mp.produto, quantidade: 0 };
          }
          produtosEntraramMap[key].quantidade += mp.quantidadeAbastecida;
        }
      });

      // Agregação Por Máquina
      const maquinaId = mov.maquina.id;
      if (!dadosPorMaquina[maquinaId]) {
        dadosPorMaquina[maquinaId] = {
          maquina: {
            id: mov.maquina.id,
            codigo: mov.maquina.codigo,
            nome: mov.maquina.nome,
          },
          fichas: 0,
          totalSairam: 0,
          totalAbastecidas: 0,
          numMovimentacoes: 0,
          produtosSairam: {},
          produtosEntraram: {},
        };
      }

      dadosPorMaquina[maquinaId].fichas += mov.fichas || 0;
      dadosPorMaquina[maquinaId].totalSairam += mov.sairam || 0;
      dadosPorMaquina[maquinaId].totalAbastecidas += mov.abastecidas || 0;
      dadosPorMaquina[maquinaId].numMovimentacoes++;

      mov.detalhesProdutos?.forEach((mp) => {
        if (mp.quantidadeSaiu > 0) {
          const key = mp.produtoId;
          if (!dadosPorMaquina[maquinaId].produtosSairam[key]) {
            dadosPorMaquina[maquinaId].produtosSairam[key] = {
              produto: mp.produto,
              quantidade: 0,
            };
          }
          dadosPorMaquina[maquinaId].produtosSairam[key].quantidade +=
            mp.quantidadeSaiu;
        }
        if (mp.quantidadeAbastecida > 0) {
          const key = mp.produtoId;
          if (!dadosPorMaquina[maquinaId].produtosEntraram[key]) {
            dadosPorMaquina[maquinaId].produtosEntraram[key] = {
              produto: mp.produto,
              quantidade: 0,
            };
          }
          dadosPorMaquina[maquinaId].produtosEntraram[key].quantidade +=
            mp.quantidadeAbastecida;
        }
      });
    });

    const produtosSairam = Object.values(produtosSairamMap).sort(
      (a, b) => b.quantidade - a.quantidade,
    );

    const produtosEntraram = Object.values(produtosEntraramMap).sort(
      (a, b) => b.quantidade - a.quantidade,
    );

    // Formatar dados por máquina, incluindo valores de dinheiro/cartão/pix
    const maquinasDetalhadas = Object.values(dadosPorMaquina).map((m) => ({
      maquina: m.maquina,
      totais: {
        fichas: m.fichas,
        produtosSairam: m.totalSairam,
        produtosEntraram: m.totalAbastecidas,
        movimentacoes: m.numMovimentacoes,
        dinheiro: valoresPorMaquina[m.maquina.id]?.dinheiro || 0,
        cartaoPix: valoresPorMaquina[m.maquina.id]?.cartaoPix || 0,
      },
      produtosSairam: Object.values(m.produtosSairam)
        .map((p) => ({
          id: p.produto.id,
          nome: p.produto.nome,
          codigo: p.produto.codigo,
          emoji: p.produto.emoji,
          quantidade: p.quantidade,
        }))
        .sort((a, b) => b.quantidade - a.quantidade),
      produtosEntraram: Object.values(m.produtosEntraram)
        .map((p) => ({
          id: p.produto.id,
          nome: p.produto.nome,
          codigo: p.produto.codigo,
          emoji: p.produto.emoji,
          quantidade: p.quantidade,
        }))
        .sort((a, b) => b.quantidade - a.quantidade),
    }));

    // Alerta: diferença entre valor das fichas (em reais) e valor total da loja
    // Calcular valor médio da ficha das máquinas
    let valorMedioFicha = 2.5;
    if (Object.values(dadosPorMaquina).length > 0) {
      const somaValorFicha = Object.values(dadosPorMaquina).reduce((acc, m) => {
        // Se houver valorFicha na máquina, use, senão 2.5
        const v = m.maquina.valorFicha ? Number(m.maquina.valorFicha) : 2.5;
        return acc + v;
      }, 0);
      valorMedioFicha = somaValorFicha / Object.values(dadosPorMaquina).length;
    }
    const valorFichasReais = totalFichas * valorMedioFicha;
    const valorTotal = valorTotalLoja;
    const diferenca = valorFichasReais - valorTotal;
    let avisoFichas = null;
    if (Math.abs(diferenca) > 0.01) {
      avisoFichas = `Atenção: diferença entre valor das fichas em reais (R$ ${valorFichasReais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) e valor total da loja (R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Diferença: R$ ${diferenca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }

    // Dados para gráficos
    const graficoSaidaPorMaquina = maquinasDetalhadas.map((m) => ({
      maquina: m.maquina.nome,
      produtosSairam: m.totais.produtosSairam,
    }));
    const graficoSaidaPorProduto = produtosSairam.map((p) => ({
      produto: p.produto.nome,
      quantidade: p.quantidade,
    }));

    res.json({
      loja: {
        id: loja.id,
        nome: loja.nome,
        endereco: loja.endereco,
      },
      periodo: {
        inicio: inicio.toISOString(),
        fim: fim.toISOString(),
      },
      totais: {
        fichas: totalFichas,
        produtosSairam: totalSairam,
        produtosEntraram: totalAbastecidas,
        movimentacoes: movimentacoes.length,
        valorTotalLoja,
        valorDinheiroLoja,
        valorCartaoPixLoja,
      },
      produtosSairam: produtosSairam.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        codigo: p.produto.codigo,
        emoji: p.produto.emoji,
        quantidade: p.quantidade,
      })),
      produtosEntraram: produtosEntraram.map((p) => ({
        id: p.produto.id,
        nome: p.produto.nome,
        codigo: p.produto.codigo,
        emoji: p.produto.emoji,
        quantidade: p.quantidade,
      })),
      maquinas: maquinasDetalhadas,
      graficoSaidaPorMaquina,
      graficoSaidaPorProduto,
      avisoFichas,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de impressão:", error);
    res.status(500).json({
      error: "Erro ao gerar relatório de impressão",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
