import { Op } from "sequelize";
import {
  Roteiro,
  Loja,
  Maquina,
  RoteiroFinalizacaoDiaria,
  GastoRoteiro,
  EstoqueUsuario,
  MovimentacaoEstoqueUsuario,
  MovimentacaoVeiculo,
  Usuario,
  Veiculo,
  LogOrdemRoteiro,
  RoteiroPontoPulado,
} from "../models/index.js";
import {
  obterResumoExecucao,
  salvarSnapshotResumoExecucao,
  montarMensagemResumoWhatsapp,
} from "../services/roteiroResumoExecucaoService.js";
import {
  getFaixaSemanaAtualUtc,
  getDataHoje,
  isFinalizadoNaSemana,
  resolverContextoExecucaoSemanal,
} from "../utils/roteiroExecucaoSemanal.js";
import RoteiroExecucaoSemanal from "../models/RoteiroExecucaoSemanal.js";
import { obterStatusMaquinasConcluidasDaExecucao } from "../utils/roteiroStatusSemanal.js";
import { garantirFuncionarioPersistenteRoteiro } from "../services/roteiroFuncionarioService.js";

const obterTotalEstoqueUsuario = async (usuarioId) => {
  if (!usuarioId) return null;

  const total = await EstoqueUsuario.sum("quantidade", {
    where: {
      usuarioId,
    },
  });

  return Number(total) || 0;
};

const chaveMaquinaRoteiro = (maquina) => {
  const codigo = String(maquina?.codigo ?? "").trim();
  if (codigo) return `codigo:${codigo.toLowerCase()}`;

  const id = String(maquina?.id ?? "").trim();
  return id ? `id:${id}` : "";
};

const deduplicarMaquinasRoteiro = (maquinas = []) => {
  const vistas = new Set();
  const unicas = [];

  for (const maquina of maquinas || []) {
    const chave = chaveMaquinaRoteiro(maquina);
    if (chave && vistas.has(chave)) continue;
    if (chave) vistas.add(chave);
    unicas.push(maquina);
  }

  return unicas;
};

const obterInicioContagemConsumoRota = async ({ roteiroId, dataHoje }) => {
  const inicioDia = new Date(`${dataHoje}T00:00:00.000Z`);
  const fimDia = new Date(`${dataHoje}T23:59:59.999Z`);

  const retiradaRota = await MovimentacaoVeiculo.findOne({
    where: {
      roteiroId,
      tipo: "retirada",
      dataHora: {
        [Op.between]: [inicioDia, fimDia],
      },
    },
    order: [["dataHora", "ASC"]],
  });

  return retiradaRota?.dataHora || inicioDia;
};

const obterEstoqueAdicionalRota = async ({
  usuarioId,
  roteiroId,
  dataHoje,
}) => {
  if (!usuarioId) return null;

  const inicioContagem = await obterInicioContagemConsumoRota({
    roteiroId,
    dataHoje,
  });
  const fimContagem = new Date(`${dataHoje}T23:59:59.999Z`);

  const adicional = await MovimentacaoEstoqueUsuario.sum("quantidade", {
    where: {
      usuarioId,
      tipoMovimentacao: "entrada",
      dataMovimentacao: {
        [Op.between]: [inicioContagem, fimContagem],
      },
    },
  });

  return Number(adicional) || 0;
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

    await garantirFuncionarioPersistenteRoteiro(roteiro);

    const contextoExecucao = await resolverContextoExecucaoSemanal(roteiro.id);
    const dataHoje = contextoExecucao.dataHoje;
    const dataInicio = contextoExecucao.dataInicio;
    const inicioDia = new Date(`${dataHoje}T00:00:00.000Z`);
    const fimDia = new Date(`${dataHoje}T23:59:59.999Z`);
    const faixaSemanaAtual = getFaixaSemanaAtualUtc();

    // Buscar status das máquinas concluídas para o roteiro (desde o inicio da execucao)
    let finalizacaoDia = await RoteiroFinalizacaoDiaria.findOne({
      where: {
        roteiroId: roteiro.id,
        data: dataHoje,
      },
    });

    const usuarioEstoqueId = roteiro.funcionarioId || null;
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

    const finalizacaoManual = finalizacaoDia?.finalizado ? finalizacaoDia : null;
    const roteiroFinalizadoSemana =
      contextoExecucao.finalizadoNaSemana || Boolean(finalizacaoManual);
    const lojasOrdenadas = [...roteiro.lojas].sort(
      (a, b) => (a.RoteiroLojas?.ordem ?? 0) - (b.RoteiroLojas?.ordem ?? 0),
    );
    const maquinaIdsRota = lojasOrdenadas.flatMap((loja) =>
      deduplicarMaquinasRoteiro(loja.maquinas).map((maquina) => maquina.id),
    );
    const {
      statusMaquinas,
      movimentacoesConsideradas,
      maquinasConcluidas: maquinasFinalizadas,
    } = await obterStatusMaquinasConcluidasDaExecucao({
      roteiroId: roteiro.id,
      dataInicio,
      maquinaIds: maquinaIdsRota,
    });

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
      const maquinasDaLoja = deduplicarMaquinasRoteiro(loja.maquinas);
      const lojaTemMaquinas = maquinasDaLoja.length > 0;
      if (lojaTemMaquinas) roteiroTemMaquinas = true;
      // Movimentações consideradas para esta loja
      const movimentacoesLoja = statusMaquinas.filter((s) => {
        return maquinasDaLoja.some((m) => m.id === s.maquina_id);
      });
      const maquinas = maquinasDaLoja.map((maquina) => {
        const finalizada = maquinasFinalizadas.has(maquina.id);
        return {
          id: maquina.id,
          nome: maquina.nome,
          codigo: maquina.codigo,
          status: finalizada ? "finalizado" : "pendente",
        };
      });
      const lojaFinalizada = maquinas.some(
        (maquina) => maquina.status === "finalizado",
      );
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
          ? Math.max(
              0,
              Number(estoqueInicialTotal) +
                Number(
                  (await obterEstoqueAdicionalRota({
                    usuarioId: usuarioEstoqueId,
                    roteiroId: roteiro.id,
                    dataHoje,
                  })) || 0,
                ) -
                Number(estoqueFinalSnapshot),
            )
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

    const mensagemResumoWhatsapp = await montarMensagemResumoWhatsapp(
      resumoPersistido,
    );

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
      status: roteiroFinalizadoSemana
        ? "finalizado"
        : contextoExecucao.emAndamento
          ? "em_andamento"
          : "pendente",
      execucaoSemanal: contextoExecucao.execucao
        ? {
            emAndamento: contextoExecucao.emAndamento,
            dataInicio: contextoExecucao.dataInicioBase,
            iniciadoEm: contextoExecucao.execucao.iniciadoEm,
            finalizadoEm: contextoExecucao.emAndamento
              ? null
              : contextoExecucao.execucao.finalizadoEm,
            usuarioId: contextoExecucao.execucao.usuarioId,
          }
        : null,
      lojas,
      lojasPendentesJustificadasIds,
      pontosPuladosStatus,
      movimentacoesHoje: statusMaquinas.map((s) => ({
        maquina_id: s.maquina_id,
        roteiro_id: s.roteiro_id,
        data: s.data,
        concluida: s.concluida,
      })),
      movimentacoesConsideradas: movimentacoesConsideradas.map((mov) => ({
        maquina_id: mov.maquinaId,
        roteiro_id: mov.roteiroId,
        dataColeta: mov.dataColeta,
        concluida: true,
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
    const data = req.query.data || getDataHoje();

    const resumo = await obterResumoExecucao({ roteiroId, data });
    if (!resumo) {
      return res.status(404).json({
        error: "Resumo de execução não encontrado para esta rota/data",
      });
    }

    const mensagemResumoWhatsapp = await montarMensagemResumoWhatsapp(resumo);
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
    const dataHoje = getDataHoje();
    const roteiroIds = roteiros.map((roteiro) => roteiro.id);
    const execucoes = roteiroIds.length
      ? await RoteiroExecucaoSemanal.findAll({
          where: {
            roteiroId: {
              [Op.in]: roteiroIds,
            },
          },
        })
      : [];
    const execucaoPorRoteiro = new Map(
      execucoes.map((execucao) => [String(execucao.roteiroId), execucao]),
    );

    const contextoPorRoteiro = new Map();
    roteiros.forEach((roteiro) => {
      const execucao = execucaoPorRoteiro.get(String(roteiro.id));
      const dataInicioBase = execucao?.dataInicio
        ? String(execucao.dataInicio)
        : dataHoje;
      const emAndamento = Boolean(execucao?.emAndamento);
      const finalizadoNaSemana = isFinalizadoNaSemana(execucao);
      const usarDataInicio = execucao && (emAndamento || finalizadoNaSemana);
      const dataInicio = usarDataInicio ? dataInicioBase : dataHoje;

      contextoPorRoteiro.set(String(roteiro.id), {
        dataInicio,
        dataInicioBase,
        emAndamento,
        finalizadoNaSemana,
        execucao,
      });
    });

    // Buscar status de todas as máquinas concluídas para todos os roteiros
    const finalizacoesManuais = await RoteiroFinalizacaoDiaria.findAll({
      where: {
        finalizado: true,
        data: dataHoje,
      },
    });
    const finalizacoesPorRoteiro = new Set(
      finalizacoesManuais.map((item) => item.roteiroId),
    );
    // Agrupar por roteiro
    const roteirosComStatus = await Promise.all(roteiros.map(async (roteiro) => {
      await garantirFuncionarioPersistenteRoteiro(roteiro);

      const contexto = contextoPorRoteiro.get(String(roteiro.id)) || {
        dataInicio: dataHoje,
        dataInicioBase: dataHoje,
        emAndamento: false,
        finalizadoNaSemana: false,
        execucao: null,
      };
      const lojasOrdenadas = [...roteiro.lojas].sort(
        (a, b) => (a.RoteiroLojas?.ordem ?? 0) - (b.RoteiroLojas?.ordem ?? 0),
      );
      const maquinaIdsRota = lojasOrdenadas.flatMap((loja) =>
        deduplicarMaquinasRoteiro(loja.maquinas).map((maquina) => maquina.id),
      );
      const {
        statusMaquinas: statusMaquinasRoteiro,
        movimentacoesConsideradas,
        maquinasConcluidas: maquinasFinalizadas,
      } = await obterStatusMaquinasConcluidasDaExecucao({
        roteiroId: roteiro.id,
        dataInicio: contexto.dataInicio,
        maquinaIds: maquinaIdsRota,
      });
      let roteiroFinalizado = lojasOrdenadas.length > 0;
      let roteiroTemMaquinas = false;
      const lojas = lojasOrdenadas.map((loja) => {
        const maquinasDaLoja = deduplicarMaquinasRoteiro(loja.maquinas);
        const lojaTemMaquinas = maquinasDaLoja.length > 0;
        if (lojaTemMaquinas) roteiroTemMaquinas = true;
        const movimentacoesLoja = statusMaquinasRoteiro.filter((s) => {
          return maquinasDaLoja.some((m) => m.id === s.maquina_id);
        });
        const maquinas = maquinasDaLoja.map((maquina) => {
          const finalizada = maquinasFinalizadas.has(maquina.id);
          return {
            id: maquina.id,
            nome: maquina.nome,
            codigo: maquina.codigo,
            status: finalizada ? "finalizado" : "pendente",
          };
        });
        const lojaFinalizada = maquinas.some(
          (maquina) => maquina.status === "finalizado",
        );
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
        status:
          contexto.finalizadoNaSemana || finalizacoesPorRoteiro.has(roteiro.id)
            ? "finalizado"
            : contexto.emAndamento
              ? "em_andamento"
              : "pendente",
        execucaoSemanal: contexto.execucao
          ? {
              emAndamento: contexto.emAndamento,
              dataInicio: contexto.dataInicioBase,
              iniciadoEm: contexto.execucao.iniciadoEm,
              finalizadoEm: contexto.emAndamento
                ? null
                : contexto.execucao.finalizadoEm,
              usuarioId: contexto.execucao.usuarioId,
            }
          : null,
        lojas,
        movimentacoesHoje: statusMaquinasRoteiro.map((s) => ({
          maquina_id: s.maquina_id,
          roteiro_id: s.roteiro_id,
          data: s.data,
          concluida: s.concluida,
        })),
        movimentacoesConsideradas: movimentacoesConsideradas.map((mov) => ({
          maquina_id: mov.maquinaId,
          roteiro_id: mov.roteiroId,
          dataColeta: mov.dataColeta,
          concluida: true,
        })),
      };
    }));
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
