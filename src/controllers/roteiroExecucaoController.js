import { Op } from "sequelize";
import {
  Roteiro,
  Loja,
  Maquina,
  RoteiroFinalizacaoDiaria,
  GastoRoteiro,
  EstoqueUsuario,
  Usuario,
  Veiculo,
  LogOrdemRoteiro,
  RoteiroPontoPulado,
} from "../models/index.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import {
  obterResumoExecucao,
  salvarSnapshotResumoExecucao,
  montarMensagemResumoWhatsapp,
} from "../services/roteiroResumoExecucaoService.js";

const obterFaixaSemanaAtualUtc = () => {
  const referencia = new Date();
  const inicioSemana = new Date(referencia);
  inicioSemana.setUTCDate(inicioSemana.getUTCDate() - inicioSemana.getUTCDay());
  inicioSemana.setUTCHours(0, 0, 0, 0);

  const fimSemana = new Date(inicioSemana);
  fimSemana.setUTCDate(fimSemana.getUTCDate() + 6);
  fimSemana.setUTCHours(23, 59, 59, 999);

  return {
    inicio: inicioSemana,
    fim: fimSemana,
    inicioSemana: inicioSemana.toISOString().slice(0, 10),
    fimSemana: fimSemana.toISOString().slice(0, 10),
  };
};

const obterTotalEstoqueUsuario = async (usuarioId) => {
  if (!usuarioId) return null;

  const total = await EstoqueUsuario.sum("quantidade", {
    where: {
      usuarioId,
    },
  });

  return Number(total) || 0;
};

async function getRoteiroExecucaoComStatus(req, res) {
  try {
    const roteiro = await Roteiro.findByPk(req.params.id, {
      include: [
        {
          model: Loja,
          as: "lojas",
          attributes: ["id", "nome", "cidade", "estado"],
          through: { attributes: ["ordem"] },
          include: [
            {
              model: Maquina,
              as: "maquinas",
              attributes: [
                "id",
                "nome",
                "codigo",
                "tipo",
                "capacidadePadrao",
                "lojaId",
              ],
            },
          ],
        },
        {
          model: Veiculo,
          as: "veiculo",
          attributes: ["id", "nome", "modelo", "tipo", "emoji"],
        },
      ],
    });
    if (!roteiro)
      return res.status(404).json({ error: "Roteiro não encontrado" });

    const dataHoje = new Date().toISOString().slice(0, 10);
    const inicioDia = new Date(`${dataHoje}T00:00:00.000Z`);
    const fimDia = new Date(`${dataHoje}T23:59:59.999Z`);
    const faixaSemanaAtual = obterFaixaSemanaAtualUtc();

    // Buscar status das máquinas concluídas para o roteiro (sem filtro diário)
    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: {
        roteiro_id: roteiro.id,
        concluida: true,
      },
    });

    let finalizacaoDia = await RoteiroFinalizacaoDiaria.findOne({
      where: {
        roteiroId: roteiro.id,
        data: dataHoje,
      },
    });

    const usuarioEstoqueId = roteiro.funcionarioId || req.usuario?.id || null;
    let estoqueInicialTotal = null;
    let estoqueAtualTotal = null;

    if (usuarioEstoqueId) {
      estoqueAtualTotal = await obterTotalEstoqueUsuario(usuarioEstoqueId);

      if (!finalizacaoDia) {
        finalizacaoDia = await RoteiroFinalizacaoDiaria.create({
          roteiroId: roteiro.id,
          data: dataHoje,
          finalizado: false,
          estoqueInicialTotal: estoqueAtualTotal,
        });
      } else if (finalizacaoDia.estoqueInicialTotal === null) {
        await finalizacaoDia.update({
          estoqueInicialTotal: estoqueAtualTotal,
        });
      }

      estoqueInicialTotal =
        finalizacaoDia.estoqueInicialTotal === null
          ? estoqueAtualTotal
          : Number(finalizacaoDia.estoqueInicialTotal);
    }

    const finalizacaoManual = finalizacaoDia?.finalizado
      ? finalizacaoDia
      : null;
    const maquinasFinalizadas = new Set(
      statusMaquinas.map((s) => s.maquina_id),
    );

    const lojasOrdenadas = [...roteiro.lojas].sort(
      (a, b) => (a.RoteiroLojas?.ordem ?? 0) - (b.RoteiroLojas?.ordem ?? 0),
    );

    const logsQuebraOrdemHoje = await LogOrdemRoteiro.findAll({
      where: {
        roteiroId: roteiro.id,
        createdAt: {
          [Op.between]: [inicioDia, fimDia],
        },
      },
      attributes: ["lojaEsperadaId"],
      raw: true,
    });

    const pontosPuladosHoje = await RoteiroPontoPulado.findAll({
      where: {
        roteiroId: roteiro.id,
        data: dataHoje,
      },
      attributes: [
        "lojaId",
        "foiPulado",
        "justificativaEnviada",
        "justificativa",
        "primeiraQuebraEm",
        "ultimaQuebraEm",
      ],
      raw: true,
    });

    const pontosPuladosStatus = pontosPuladosHoje.reduce((acc, item) => {
      acc[item.lojaId] = {
        foiPulado: Boolean(item.foiPulado),
        justificativaEnviada: Boolean(item.justificativaEnviada),
        justificativa: item.justificativa || null,
        primeiraQuebraEm: item.primeiraQuebraEm || null,
        ultimaQuebraEm: item.ultimaQuebraEm || null,
      };
      return acc;
    }, {});

    const lojasPendentesJustificadasIds = Array.from(
      new Set(
        logsQuebraOrdemHoje
          .map((item) => String(item.lojaEsperadaId || "").trim())
          .filter(Boolean),
      ),
    );

    let roteiroFinalizado = lojasOrdenadas.length > 0;
    let roteiroTemMaquinas = false;
    const lojas = lojasOrdenadas.map((loja) => {
      const lojaTemMaquinas = (loja.maquinas?.length || 0) > 0;
      let lojaFinalizada = lojaTemMaquinas;
      if (lojaTemMaquinas) roteiroTemMaquinas = true;
      // Movimentações consideradas para esta loja
      const movimentacoesLoja = statusMaquinas.filter((s) => {
        return loja.maquinas.some((m) => m.id === s.maquina_id);
      });
      const maquinas = loja.maquinas.map((maquina) => {
        const finalizada = maquinasFinalizadas.has(maquina.id);
        if (!finalizada) lojaFinalizada = false;
        return {
          id: maquina.id,
          nome: maquina.nome,
          status: finalizada ? "finalizado" : "pendente",
        };
      });
      if (!lojaFinalizada) roteiroFinalizado = false;
      return {
        id: loja.id,
        nome: loja.nome,
        status: lojaFinalizada ? "finalizado" : "pendente",
        maquinas,
        ordem: loja.RoteiroLojas?.ordem ?? 0,
        movimentacoesConsideradas: movimentacoesLoja.map((s) => ({
          maquina_id: s.maquina_id,
          roteiro_id: s.roteiro_id,
          data: s.data,
          concluida: s.concluida,
        })),
      };
    });

    if (!roteiroTemMaquinas) {
      roteiroFinalizado = false;
    }

    const gastosSemana = await GastoRoteiro.findAll({
      where: {
        roteiroId: roteiro.id,
        dataHora: {
          [Op.between]: [faixaSemanaAtual.inicio, faixaSemanaAtual.fim],
        },
      },
      include: [
        {
          model: Usuario,
          as: "usuario",
          attributes: ["id", "nome"],
        },
      ],
      order: [["dataHora", "DESC"]],
    });

    const totalGastoSemana = gastosSemana.reduce(
      (acc, gasto) => acc + Number.parseFloat(gasto.valor || 0),
      0,
    );
    const orcamentoDiario = Number.parseFloat(roteiro.orcamentoDiario || 2000);
    const saldoGastoSemana = Number.parseFloat(
      (orcamentoDiario - totalGastoSemana).toFixed(2),
    );

    const estoqueFinalSnapshot =
      finalizacaoDia?.estoqueFinalTotal !== null &&
      finalizacaoDia?.estoqueFinalTotal !== undefined
        ? Number(finalizacaoDia.estoqueFinalTotal)
        : estoqueAtualTotal;

    const consumoSnapshot =
      finalizacaoDia?.consumoTotalProdutos !== null &&
      finalizacaoDia?.consumoTotalProdutos !== undefined
        ? Number(finalizacaoDia.consumoTotalProdutos)
        : estoqueInicialTotal !== null && estoqueFinalSnapshot !== null
          ? Math.max(0, estoqueInicialTotal - estoqueFinalSnapshot)
          : null;

    const resumoPersistido = await salvarSnapshotResumoExecucao({
      roteiroId: roteiro.id,
      data: dataHoje,
      roteiroNome: roteiro.nome,
      lojas,
      estoqueInicialTotal,
      estoqueFinalTotal: estoqueFinalSnapshot,
      consumoTotalProdutos: consumoSnapshot,
    });

    const mensagemResumoWhatsapp = montarMensagemResumoWhatsapp(resumoPersistido);

    res.json({
      id: roteiro.id,
      nome: roteiro.nome,
      observacao: roteiro.observacao,
      veiculoId: roteiro.veiculoId ?? null,
      veiculo: roteiro.veiculo
        ? {
            id: roteiro.veiculo.id,
            nome: roteiro.veiculo.nome,
            modelo: roteiro.veiculo.modelo,
            tipo: roteiro.veiculo.tipo,
            emoji: roteiro.veiculo.emoji,
          }
        : null,
      orcamentoDiario,
      orcamentoSemanal: orcamentoDiario,
      periodoGastos: {
        tipo: "semanal",
        inicioSemana: faixaSemanaAtual.inicioSemana,
        fimSemana: faixaSemanaAtual.fimSemana,
      },
      totalGastoHoje: Number.parseFloat(totalGastoSemana.toFixed(2)),
      totalGastoSemana: Number.parseFloat(totalGastoSemana.toFixed(2)),
      saldoGastoHoje: saldoGastoSemana,
      saldoGastoSemana,
      gastosHoje: gastosSemana.map((gasto) => ({
        id: gasto.id,
        categoria: gasto.categoria,
        valor: Number.parseFloat(gasto.valor || 0),
        quilometragem:
          gasto.quilometragem !== null && gasto.quilometragem !== undefined
            ? Number.parseInt(gasto.quilometragem, 10)
            : null,
        observacao: gasto.observacao,
        dataHora: gasto.dataHora,
        usuario: gasto.usuario
          ? {
              id: gasto.usuario.id,
              nome: gasto.usuario.nome,
            }
          : null,
      })),
      gastosSemana: gastosSemana.map((gasto) => ({
        id: gasto.id,
        categoria: gasto.categoria,
        valor: Number.parseFloat(gasto.valor || 0),
        quilometragem:
          gasto.quilometragem !== null && gasto.quilometragem !== undefined
            ? Number.parseInt(gasto.quilometragem, 10)
            : null,
        observacao: gasto.observacao,
        dataHora: gasto.dataHora,
        usuario: gasto.usuario
          ? {
              id: gasto.usuario.id,
              nome: gasto.usuario.nome,
            }
          : null,
      })),
      status: finalizacaoManual ? "finalizado" : "pendente",
      lojas,
      lojasPendentesJustificadasIds,
      pontosPuladosStatus,
      movimentacoesHoje: statusMaquinas.map((s) => ({
        maquina_id: s.maquina_id,
        roteiro_id: s.roteiro_id,
        data: s.data,
        concluida: s.concluida,
      })),
      resumoConsumoProdutos: {
        usuarioIdReferencia: usuarioEstoqueId,
        estoqueInicialTotal:
          estoqueInicialTotal ??
          (finalizacaoDia?.estoqueInicialTotal !== null
            ? Number(finalizacaoDia?.estoqueInicialTotal)
            : null),
        estoqueFinalTotal:
          finalizacaoDia?.estoqueFinalTotal !== null
            ? Number(finalizacaoDia?.estoqueFinalTotal)
            : null,
        consumoTotalProdutos:
          finalizacaoDia?.consumoTotalProdutos !== null
            ? Number(finalizacaoDia?.consumoTotalProdutos)
            : null,
      },
      resumoExecucaoPersistido: resumoPersistido,
      mensagemResumoWhatsapp,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar execução do roteiro" });
  }
}

async function getResumoExecucaoPersistido(req, res) {
  try {
    const { id: roteiroId } = req.params;
    const data = req.query.data || new Date().toISOString().slice(0, 10);

    const resumo = await obterResumoExecucao({ roteiroId, data });
    if (!resumo) {
      return res.status(404).json({
        error: "Resumo de execução não encontrado para esta rota/data",
      });
    }

    const mensagemResumoWhatsapp = montarMensagemResumoWhatsapp(resumo);
    return res.json({
      resumo,
      mensagemResumoWhatsapp,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao buscar resumo persistido da execução",
    });
  }
}

// Buscar todos os roteiros, lojas, máquinas e calcular status
async function getTodosRoteirosComStatus(req, res) {
  try {
    const roteiros = await Roteiro.findAll({
      include: [
        {
          model: Loja,
          as: "lojas",
          attributes: ["id", "nome", "cidade", "estado"],
          through: { attributes: ["ordem"] },
          include: [
            {
              model: Maquina,
              as: "maquinas",
              attributes: [
                "id",
                "nome",
                "codigo",
                "tipo",
                "capacidadePadrao",
                "lojaId",
              ],
            },
          ],
        },
        {
          model: Veiculo,
          as: "veiculo",
          attributes: ["id", "nome", "modelo", "tipo", "emoji"],
        },
      ],
    });
    const dataHoje = new Date().toISOString().slice(0, 10);
    // Buscar status de todas as máquinas concluídas para todos os roteiros
    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: {
        concluida: true,
      },
    });
    const finalizacoesManuais = await RoteiroFinalizacaoDiaria.findAll({
      where: {
        finalizado: true,
      },
    });
    const finalizacoesPorRoteiro = new Set(
      finalizacoesManuais.map((item) => item.roteiroId),
    );
    // Agrupar por roteiro
    const roteirosComStatus = roteiros.map((roteiro) => {
      const statusMaquinasRoteiro = statusMaquinas.filter(
        (s) => s.roteiro_id === roteiro.id,
      );
      const maquinasFinalizadas = new Set(
        statusMaquinasRoteiro.map((s) => s.maquina_id),
      );
      const lojasOrdenadas = [...roteiro.lojas].sort(
        (a, b) => (a.RoteiroLojas?.ordem ?? 0) - (b.RoteiroLojas?.ordem ?? 0),
      );
      let roteiroFinalizado = lojasOrdenadas.length > 0;
      let roteiroTemMaquinas = false;
      const lojas = lojasOrdenadas.map((loja) => {
        const lojaTemMaquinas = (loja.maquinas?.length || 0) > 0;
        let lojaFinalizada = lojaTemMaquinas;
        if (lojaTemMaquinas) roteiroTemMaquinas = true;
        const movimentacoesLoja = statusMaquinasRoteiro.filter((s) => {
          return loja.maquinas.some((m) => m.id === s.maquina_id);
        });
        const maquinas = loja.maquinas.map((maquina) => {
          const finalizada = maquinasFinalizadas.has(maquina.id);
          if (!finalizada) lojaFinalizada = false;
          return {
            id: maquina.id,
            nome: maquina.nome,
            status: finalizada ? "finalizado" : "pendente",
          };
        });
        if (!lojaFinalizada) roteiroFinalizado = false;
        return {
          id: loja.id,
          nome: loja.nome,
          status: lojaFinalizada ? "finalizado" : "pendente",
          maquinas,
          ordem: loja.RoteiroLojas?.ordem ?? 0,
          movimentacoesConsideradas: movimentacoesLoja.map((s) => ({
            maquina_id: s.maquina_id,
            roteiro_id: s.roteiro_id,
            data: s.data,
            concluida: s.concluida,
          })),
        };
      });

      if (!roteiroTemMaquinas) {
        roteiroFinalizado = false;
      }

      return {
        id: roteiro.id,
        nome: roteiro.nome,
        observacao: roteiro.observacao,
        orcamentoDiario: Number.parseFloat(roteiro.orcamentoDiario || 2000),
        orcamentoSemanal: Number.parseFloat(roteiro.orcamentoDiario || 2000),
        funcionarioId: roteiro.funcionarioId,
        funcionarioNome: roteiro.funcionarioNome,
        veiculoId: roteiro.veiculoId ?? null,
        veiculo: roteiro.veiculo
          ? {
              id: roteiro.veiculo.id,
              nome: roteiro.veiculo.nome,
              modelo: roteiro.veiculo.modelo,
              tipo: roteiro.veiculo.tipo,
              emoji: roteiro.veiculo.emoji,
            }
          : null,
        diasSemana: roteiro.diasSemana ?? [],
        status: finalizacoesPorRoteiro.has(roteiro.id)
          ? "finalizado"
          : "pendente",
        lojas,
        movimentacoesHoje: statusMaquinasRoteiro.map((s) => ({
          maquina_id: s.maquina_id,
          roteiro_id: s.roteiro_id,
          data: s.data,
          concluida: s.concluida,
        })),
      };
    });
    res.json(roteirosComStatus);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar status dos roteiros" });
  }
}

export {
  getRoteiroExecucaoComStatus,
  getTodosRoteirosComStatus,
  getResumoExecucaoPersistido,
};
