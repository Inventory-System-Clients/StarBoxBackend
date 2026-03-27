import { Op } from "sequelize";
import {
  Movimentacao,
  Maquina,
  FluxoCaixa,
} from "../models/index.js";

// Renda bruta diária consolidada de todas as lojas para o mês informado
export const lucroDiario = async (req, res) => {
  try {
    const paraNumero = (valor) => {
      const numero = Number(valor);
      return Number.isFinite(numero) ? numero : 0;
    };

    const pad2 = (valor) => String(valor).padStart(2, "0");
    const formatarDataLocal = (data) =>
      `${data.getFullYear()}-${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`;

    const arredondar2 = (valor) => Number(paraNumero(valor).toFixed(2));

    const { ano: anoQuery, mes: mesQuery } = req.query;
    const hoje = new Date();

    const ano = Number(anoQuery ?? hoje.getFullYear());
    const mes = Number(mesQuery ?? hoje.getMonth() + 1);

    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetro ano inválido" });
    }

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({ error: "Parâmetro mes inválido" });
    }

    const mesIndex = mes - 1;
    const inicioMes = new Date(ano, mesIndex, 1, 0, 0, 0, 0);
    const fimMes = new Date(ano, mesIndex + 1, 0, 23, 59, 59, 999);

    const resultado = {};
    const acumuladoresPorDia = {};

    for (
      let data = new Date(inicioMes);
      data <= fimMes;
      data = new Date(data.getFullYear(), data.getMonth(), data.getDate() + 1)
    ) {
      const chave = formatarDataLocal(data);
      resultado[chave] = 0;
      acumuladoresPorDia[chave] = { receitaBruta: 0 };
    }

    const movimentacoes = await Movimentacao.findAll({
      where: {
        dataColeta: { [Op.between]: [inicioMes, fimMes] },
        retiradaEstoque: false,
      },
      include: [
        {
          model: Maquina,
          as: "maquina",
          attributes: ["valorFicha", "comissaoLojaPercentual"],
        },
        {
          model: FluxoCaixa,
          as: "fluxoCaixa",
          required: false,
          attributes: ["valorRetirado"],
        },
      ],
    });

    for (const mov of movimentacoes) {
      const dataMov = mov?.dataColeta ? new Date(mov.dataColeta) : null;
      if (!dataMov) continue;
      const chave = formatarDataLocal(dataMov);
      const acumulador = acumuladoresPorDia[chave];
      if (!acumulador) continue;

      const fichas = paraNumero(mov.fichas);
      const valorFicha = paraNumero(mov.maquina?.valorFicha);
      const dinheiro = paraNumero(mov.quantidade_notas_entrada);
      const pix = paraNumero(mov.valor_entrada_maquininha_pix);

      let valorFichas = fichas * valorFicha;
      if (mov.retiradaDinheiro && mov.fluxoCaixa?.valorRetirado !== null) {
        valorFichas = paraNumero(mov.fluxoCaixa?.valorRetirado);
      }

      const receitaMaquina = valorFichas + dinheiro + pix;
      acumulador.receitaBruta += receitaMaquina;
    }

    for (const [data, valores] of Object.entries(acumuladoresPorDia)) {
      resultado[data] = arredondar2(valores.receitaBruta);
    }

    res.json(resultado);
  } catch (error) {
    console.error("[dashboard.lucroDiario] Erro:", error);
    res.status(500).json({ error: "Erro ao gerar renda bruta diária consolidada" });
  }
};

// Faturamento dos últimos 7 dias detalhado por tipo
export const faturamentoSemanal = async (req, res) => {
  try {
    const { lojaId } = req.query;
    const hoje = new Date();
    const datas = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      datas.push(new Date(d));
    }
    const resultado = {};
    for (const data of datas) {
      const inicio = new Date(data);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(data);
      fim.setHours(23, 59, 59, 999);
      const dataISO = inicio.toISOString().slice(0, 10);
      const where = {
        dataColeta: { [Op.between]: [inicio, fim] },
        retiradaEstoque: false,
      };
      if (lojaId) where["$maquina.lojaId$"] = lojaId;
      const movimentacoes = await Movimentacao.findAll({
        where,
        include: [{ model: Maquina, as: "maquina", attributes: ["lojaId"] }],
      });
      let dinheiro = 0;
      let pixCartao = 0;
      for (const m of movimentacoes) {
        dinheiro += parseFloat(m.quantidade_notas_entrada || 0);
        pixCartao += parseFloat(m.valor_entrada_maquininha_pix || 0);
      }
      resultado[dataISO] = {
        dinheiro: parseFloat(dinheiro.toFixed(2)),
        pixCartao: parseFloat(pixCartao.toFixed(2)),
      };
    }
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Comparação de renda bruta acumulada até hoje (mês atual vs anterior)
export const comparacaoLucro = async (req, res) => {
  try {
    const { lojaId } = req.query;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? ano - 1 : ano;
    const diaAtual = hoje.getDate();
    async function somaLucro(ano, mes, dias) {
      let total = 0;
      for (let i = 1; i <= dias; i++) {
        const inicio = new Date(ano, mes, i, 0, 0, 0, 0);
        const fim = new Date(ano, mes, i, 23, 59, 59, 999);
        const where = {
          dataColeta: { [Op.between]: [inicio, fim] },
          retiradaEstoque: false,
        };
        if (lojaId) where["$maquina.lojaId$"] = lojaId;
        // Busca movimentações do dia
        // (simplificado, sem custos)
        // eslint-disable-next-line no-await-in-loop
        const movimentacoes = await Movimentacao.findAll({
          where,
          include: [{ model: Maquina, as: "maquina", attributes: ["valorFicha", "lojaId"] }],
        });
        let receitaBruta = 0;
        for (const m of movimentacoes) {
          const fichas = parseInt(m.fichas) || 0;
          const valorFicha = parseFloat(m.maquina?.valorFicha || 0);
          const dinheiro = parseFloat(m.quantidade_notas_entrada || 0);
          const pix = parseFloat(m.valor_entrada_maquininha_pix || 0);
          const receitaMaquina = fichas * valorFicha + dinheiro + pix;
          receitaBruta += receitaMaquina;
        }
        total += receitaBruta;
      }
      return total;
    }
    const atual = await somaLucro(ano, mesAtual, diaAtual);
    const anterior = await somaLucro(anoAnterior, mesAnterior, diaAtual);
    res.json({
      atual: parseFloat(atual.toFixed(2)),
      anterior: parseFloat(anterior.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
