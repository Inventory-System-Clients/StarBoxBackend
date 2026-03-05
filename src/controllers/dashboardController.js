import { Op } from "sequelize";
import { Movimentacao, Maquina } from "../models/index.js";

// Lucro diário agrupado por dia para mês atual e anterior
export const lucroDiario = async (req, res) => {
  try {
    const { lojaId } = req.query;
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? ano - 1 : ano;

    // Gera array de datas do mês atual e anterior
    function datasDoMes(ano, mes) {
      const datas = [];
      const primeiro = new Date(ano, mes, 1);
      const ultimo = new Date(ano, mes + 1, 0);
      for (let d = new Date(primeiro); d <= ultimo; d.setDate(d.getDate() + 1)) {
        datas.push(new Date(d));
      }
      return datas;
    }
    const datasAtual = datasDoMes(ano, mesAtual);
    const datasAnt = datasDoMes(anoAnterior, mesAnterior);
    const todasDatas = [...datasAnt, ...datasAtual];

    // Busca lucro por dia
    const resultado = {};
    for (const data of todasDatas) {
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
        include: [{ model: Maquina, as: "maquina", attributes: ["valorFicha", "lojaId"] }],
      });
      let receitaBruta = 0;
      let custoProdutos = 0;
      let comissaoTotal = 0;
      for (const m of movimentacoes) {
        const fichas = parseInt(m.fichas) || 0;
        const valorFicha = parseFloat(m.maquina?.valorFicha || 0);
        const dinheiro = parseFloat(m.quantidade_notas_entrada || 0);
        const pix = parseFloat(m.valor_entrada_maquininha_pix || 0);
        const receitaMaquina = fichas * valorFicha + dinheiro + pix;
        receitaBruta += receitaMaquina;
        const percentual = parseFloat(m.maquina?.comissaoLojaPercentual || 0);
        comissaoTotal += (receitaMaquina * percentual) / 100;
        // Custo produtos: se tiver MovimentacaoProduto, some aqui
        // (simplificado, pois não temos acesso direto)
      }
      // custos fixos/variáveis omitidos para simplificação
      const lucroTotal = receitaBruta - custoProdutos - comissaoTotal;
      resultado[dataISO] = parseFloat(lucroTotal.toFixed(2));
    }
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Comparação de lucro acumulado até hoje (mês atual vs anterior)
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
        let comissaoTotal = 0;
        for (const m of movimentacoes) {
          const fichas = parseInt(m.fichas) || 0;
          const valorFicha = parseFloat(m.maquina?.valorFicha || 0);
          const dinheiro = parseFloat(m.quantidade_notas_entrada || 0);
          const pix = parseFloat(m.valor_entrada_maquininha_pix || 0);
          const receitaMaquina = fichas * valorFicha + dinheiro + pix;
          receitaBruta += receitaMaquina;
          const percentual = parseFloat(m.maquina?.comissaoLojaPercentual || 0);
          comissaoTotal += (receitaMaquina * percentual) / 100;
        }
        total += receitaBruta - comissaoTotal;
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
