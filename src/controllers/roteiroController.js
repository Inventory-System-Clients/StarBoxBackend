import {
  Roteiro,
  Loja,
  Usuario,
  Maquina,
  RoteiroFinalizacaoDiaria,
  Veiculo,
  GastoRoteiro,
  LogOrdemRoteiro,
  RoteiroLoja,
  Manutencao,
  ManutencaoWhatsAppPrompt,
  Movimentacao,
  MovimentacaoEstoqueUsuario,
  MovimentacaoVeiculo,
  EstoqueUsuario,
  RoteiroPontoPulado,
  RoteiroExecucaoSemanal,
} from "../models/index.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import { criarAlertaRoteiroPendente } from "../services/whatsappAlertaService.js";
import { sequelize } from "../database/connection.js";
import { randomUUID } from "crypto";
import { Op } from "sequelize";
import {
  fecharResumoExecucao,
  montarMensagemResumoWhatsapp,
} from "../services/roteiroResumoExecucaoService.js";
import { resolverContextoExecucaoSemanal } from "../utils/roteiroExecucaoSemanal.js";

const DIAS_VALIDOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

const ROLES_ADMIN_EQUIVALENTES = new Set(["ADMIN", "GERENCIADOR"]);
const ROLES_FUNCIONARIO_ROTEIRO = new Set([
  "FUNCIONARIO",
  "FUNCIONARIO_TODAS_LOJAS",
]);

const getRequestId = (req) =>
  req.requestId || req.id || req.headers?.["x-request-id"] || randomUUID();

const logFinalizacaoForbidden = ({
  requestId,
  userId,
  role,
  roteiroId,
  roteiroFuncionarioId,
  motivo,
}) => {
  console.warn({
    evento: "roteiro_finalizacao_forbidden",
    requestId,
    userId,
    role,
    roteiroId,
    roteiroFuncionarioId,
    motivo,
  });
};

const responderForbiddenFinalizacao = (res, motivo) => {
  const mensagens = {
    role_not_allowed: "Seu perfil não pode finalizar este roteiro",
    not_assigned_to_roteiro:
      "Você não é o funcionário responsável por este roteiro",
  };

  return res.status(403).json({
    error: {
      code: motivo,
      message: mensagens[motivo] || "Acesso negado para finalizar roteiro",
    },
  });
};

const validarPermissaoFinalizacao = ({
  userId,
  role,
  roteiroFuncionarioId,
}) => {
  const usuarioEhAdminEquivalente = ROLES_ADMIN_EQUIVALENTES.has(role);
  const usuarioEhFuncionarioDoRoteiro =
    ROLES_FUNCIONARIO_ROTEIRO.has(role) &&
    String(userId) === String(roteiroFuncionarioId);

  if (usuarioEhAdminEquivalente || usuarioEhFuncionarioDoRoteiro) {
    return { autorizado: true, motivo: null };
  }

  const motivo = ROLES_FUNCIONARIO_ROTEIRO.has(role)
    ? "not_assigned_to_roteiro"
    : "role_not_allowed";

  return { autorizado: false, motivo };
};

const parseValorMonetario = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    return Number.parseFloat(valor.replace(",", ".").trim());
  }
  return Number.NaN;
};

const parseKmNaoNegativo = (valor) => {
  if (valor === null || valor === undefined || String(valor).trim() === "") {
    return null;
  }

  const kmConvertido = Number.parseInt(valor, 10);
  if (!Number.isInteger(kmConvertido) || kmConvertido < 0) {
    return Number.NaN;
  }

  return kmConvertido;
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

export const criarRoteiro = async (req, res) => {
  try {
    const {
      nome,
      diasSemana,
      observacao,
      orcamentoSemanal,
      orcamentoDiario,
      veiculoId,
    } = req.body;
    const orcamentoRecebido =
      orcamentoSemanal !== undefined ? orcamentoSemanal : orcamentoDiario;
    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
    if (observacao !== undefined && typeof observacao !== "string") {
      return res.status(400).json({ error: "observacao deve ser um texto" });
    }
    if (orcamentoRecebido !== undefined) {
      const valorOrcamento = parseValorMonetario(orcamentoRecebido);
      if (!Number.isFinite(valorOrcamento) || valorOrcamento <= 0) {
        return res.status(400).json({
          error: "orcamentoSemanal deve ser um número maior que zero",
        });
      }
    }
    if (diasSemana !== undefined) {
      if (!Array.isArray(diasSemana))
        return res.status(400).json({ error: "diasSemana deve ser um array" });
      const invalidos = diasSemana.filter((d) => !DIAS_VALIDOS.includes(d));
      if (invalidos.length > 0)
        return res.status(400).json({
          error: `Dias inválidos: ${invalidos.join(", ")}. Use: ${DIAS_VALIDOS.join(", ")}`,
        });
    }

    const veiculoIdNormalizado = veiculoId === "" ? null : (veiculoId ?? null);
    if (veiculoIdNormalizado) {
      const veiculo = await Veiculo.findByPk(veiculoIdNormalizado);
      if (!veiculo)
        return res.status(404).json({ error: "Veículo não encontrado" });
    }
    const roteiro = await Roteiro.create({
      nome,
      diasSemana: diasSemana ?? [],
      observacao: observacao?.trim() || null,
      veiculoId: veiculoIdNormalizado,
      ...(orcamentoRecebido !== undefined
        ? {
            orcamentoDiario: Number.parseFloat(
              parseValorMonetario(orcamentoRecebido).toFixed(2),
            ),
          }
        : {}),
    });
    res.status(201).json(roteiro);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar roteiro" });
  }
};

export const atualizarDiasSemana = async (req, res) => {
  try {
    const { id } = req.params;
    const { diasSemana, ...outrosCampos } = req.body;

    const roteiro = await Roteiro.findByPk(id);
    if (!roteiro)
      return res.status(404).json({ error: "Roteiro não encontrado" });

    const updateData = {};

    if (diasSemana !== undefined) {
      if (!Array.isArray(diasSemana))
        return res.status(400).json({ error: "diasSemana deve ser um array" });
      const invalidos = diasSemana.filter((d) => !DIAS_VALIDOS.includes(d));
      if (invalidos.length > 0)
        return res.status(400).json({
          error: `Dias inválidos: ${invalidos.join(", ")}. Use: ${DIAS_VALIDOS.join(", ")}`,
        });
      updateData.diasSemana = diasSemana;
    }

    if (outrosCampos.nome !== undefined) updateData.nome = outrosCampos.nome;
    if (outrosCampos.observacao !== undefined) {
      if (typeof outrosCampos.observacao !== "string") {
        return res.status(400).json({ error: "observacao deve ser um texto" });
      }
      updateData.observacao = outrosCampos.observacao.trim() || null;
    }

    const orcamentoRecebido =
      outrosCampos.orcamentoSemanal !== undefined
        ? outrosCampos.orcamentoSemanal
        : outrosCampos.orcamentoDiario;

    if (orcamentoRecebido !== undefined) {
      const valorOrcamento = parseValorMonetario(orcamentoRecebido);
      if (!Number.isFinite(valorOrcamento) || valorOrcamento <= 0) {
        return res.status(400).json({
          error: "orcamentoSemanal deve ser um número maior que zero",
        });
      }
      updateData.orcamentoDiario = Number.parseFloat(valorOrcamento.toFixed(2));
    }

    if (outrosCampos.veiculoId !== undefined) {
      const veiculoIdNormalizado =
        outrosCampos.veiculoId === "" ? null : outrosCampos.veiculoId;
      if (veiculoIdNormalizado) {
        const veiculo = await Veiculo.findByPk(veiculoIdNormalizado);
        if (!veiculo)
          return res.status(404).json({ error: "Veículo não encontrado" });
      }
      updateData.veiculoId = veiculoIdNormalizado;
    }

    if (Object.keys(updateData).length === 0)
      return res
        .status(400)
        .json({ error: "Nenhum campo válido para atualizar" });

    await roteiro.update(updateData);
    res.json(roteiro);
  } catch (error) {
    console.error("Erro ao atualizar roteiro:", error);
    res.status(500).json({ error: "Erro ao atualizar roteiro" });
  }
};

export const listarRoteiros = async (req, res) => {
  try {
    const roteiros = await Roteiro.findAll({
      include: [
        { model: Usuario, as: "funcionario", attributes: ["id", "nome"] },
        {
          model: Veiculo,
          as: "veiculo",
          attributes: ["id", "nome", "modelo", "tipo", "emoji"],
        },
        { model: Loja, as: "lojas", attributes: ["id", "nome"] },
      ],
    });
    res.json(roteiros);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar roteiros" });
  }
};

export const iniciarRoteiro = async (req, res) => {
  try {
    const { funcionarioId, funcionarioNome, veiculoId } = req.body;
    const roteiro = await Roteiro.findByPk(req.params.id);
    if (!roteiro)
      return res.status(404).json({ error: "Roteiro não encontrado" });

    const veiculoIdNormalizado = veiculoId === "" ? null : veiculoId;
    if (veiculoIdNormalizado) {
      const veiculo = await Veiculo.findByPk(veiculoIdNormalizado);
      if (!veiculo)
        return res.status(404).json({ error: "Veículo não encontrado" });
    }

    const update = {};
    if (funcionarioId !== undefined) update.funcionarioId = funcionarioId;
    if (funcionarioNome !== undefined) update.funcionarioNome = funcionarioNome;
    if (veiculoId !== undefined) update.veiculoId = veiculoIdNormalizado;

    await roteiro.update(update);

    const dataHoje = new Date().toISOString().slice(0, 10);
    const execucaoExistente = await RoteiroExecucaoSemanal.findOne({
      where: { roteiroId: roteiro.id },
    });

    if (execucaoExistente?.emAndamento) {
      if (!execucaoExistente.usuarioId && req.usuario?.id) {
        await execucaoExistente.update({ usuarioId: req.usuario.id });
      }
    } else if (execucaoExistente) {
      await execucaoExistente.update({
        usuarioId: req.usuario?.id || execucaoExistente.usuarioId || null,
        dataInicio: dataHoje,
        iniciadoEm: new Date(),
        emAndamento: true,
        finalizadoEm: null,
      });
    } else {
      await RoteiroExecucaoSemanal.create({
        roteiroId: roteiro.id,
        usuarioId: req.usuario?.id || null,
        dataInicio: dataHoje,
        iniciadoEm: new Date(),
        emAndamento: true,
        finalizadoEm: null,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao iniciar roteiro" });
  }
};

export const moverLoja = async (req, res) => {
  try {
    const { lojaId, roteiroOrigemId, roteiroDestinoId } = req.body;
    const roteiroOrigem = await Roteiro.findByPk(roteiroOrigemId);
    const roteiroDestino = await Roteiro.findByPk(roteiroDestinoId);
    if (!roteiroOrigem || !roteiroDestino)
      return res.status(404).json({ error: "Roteiro não encontrado" });
    await roteiroOrigem.removeLoja(lojaId);
    await roteiroDestino.addLoja(lojaId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao mover loja" });
  }
};

export const finalizarRoteiro = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const roteiroId = req.params.id;
    const dataHoje = new Date().toISOString().slice(0, 10);
    const requestId = getRequestId(req);
    const userId = req.usuario.id;
    const role = req.usuario.role;
    const kmFinalRota = parseKmNaoNegativo(req.body?.kmFinalVeiculo);

    if (Number.isNaN(kmFinalRota)) {
      return res.status(400).json({
        error: "kmFinalVeiculo deve ser um número inteiro maior ou igual a zero",
      });
    }

    const roteiro = await Roteiro.findByPk(roteiroId, {
      include: [
        {
          model: Loja,
          as: "lojas",
          attributes: ["id", "nome"],
          include: [
            {
              model: Maquina,
              as: "maquinas",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
    });

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    const roteiroFuncionarioId = roteiro.funcionarioId || null;
    const { autorizado, motivo } = validarPermissaoFinalizacao({
      userId,
      role,
      roteiroFuncionarioId,
    });

    if (!autorizado) {

      logFinalizacaoForbidden({
        requestId,
        userId,
        role,
        roteiroId,
        roteiroFuncionarioId,
        motivo,
      });

      return responderForbiddenFinalizacao(res, motivo);
    }

    if (roteiro.veiculoId) {
      const veiculo = await Veiculo.findByPk(roteiro.veiculoId);

      if (!veiculo) {
        return res.status(404).json({ error: "Veículo do roteiro não encontrado" });
      }

      const movimentacaoDevolucaoDia = await MovimentacaoVeiculo.findOne({
        where: {
          roteiroId,
          veiculoId: roteiro.veiculoId,
          tipo: "devolucao",
          dataHora: {
            [Op.between]: [
              new Date(`${dataHoje}T00:00:00.000Z`),
              new Date(`${dataHoje}T23:59:59.999Z`),
            ],
          },
        },
        order: [["dataHora", "DESC"]],
      });

      if (kmFinalRota === null && !movimentacaoDevolucaoDia) {
        return res.status(400).json({
          error:
            "kmFinalVeiculo é obrigatório para finalizar roteiro com veículo quando não existe devolução registrada no dia",
        });
      }

      if (kmFinalRota !== null) {
        const ultimaMovimentacaoComKm = await MovimentacaoVeiculo.findOne({
          where: {
            veiculoId: roteiro.veiculoId,
            km: {
              [Op.ne]: null,
            },
          },
          order: [["dataHora", "DESC"]],
        });

        const kmAtualVeiculo = Number.parseInt(veiculo.km, 10);
        const kmUltimaMovimentacao = Number.parseInt(
          ultimaMovimentacaoComKm?.km,
          10,
        );

        const kmReferencia = Math.max(
          Number.isInteger(kmAtualVeiculo) ? kmAtualVeiculo : 0,
          Number.isInteger(kmUltimaMovimentacao) ? kmUltimaMovimentacao : 0,
        );

        if (kmFinalRota < kmReferencia) {
          return res.status(400).json({
            error: `O KM final informado (${kmFinalRota}) não pode ser menor que o KM anterior (${kmReferencia}).`,
            kmReferencia,
          });
        }

        await MovimentacaoVeiculo.create({
          veiculoId: roteiro.veiculoId,
          usuarioId: req.usuario.id,
          tipo: "devolucao",
          dataHora: new Date(),
          km: kmFinalRota,
          roteiroId,
          obs: "Devolução registrada na finalização do roteiro",
        });

        if (kmFinalRota > Number(veiculo.km || 0)) {
          await veiculo.update({ km: kmFinalRota });
        }
      }
    }

    const contextoExecucao = await resolverContextoExecucaoSemanal(roteiroId);

    // Busca status desde o inicio da execucao semanal
    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: {
        roteiro_id: roteiroId,
        concluida: true,
        data: {
          [Op.gte]: contextoExecucao.dataInicio,
        },
      },
    });

    const maquinasConcluidas = new Set(
      statusMaquinas.map((item) => item.maquina_id),
    );

    // Também considera máquinas com movimentação desde o inicio da execucao como concluídas
    const inicioExecucao = new Date(
      `${contextoExecucao.dataInicio}T00:00:00.000Z`,
    );
    const maquinaIdsRota = roteiro.lojas.flatMap((loja) =>
      (loja.maquinas || []).map((maquina) => maquina.id),
    );
    if (maquinaIdsRota.length) {
      const movRecentes = await Movimentacao.findAll({
        attributes: ["maquinaId"],
        where: {
          maquinaId: { [Op.in]: maquinaIdsRota },
          dataColeta: { [Op.gte]: inicioExecucao },
        },
      });
      movRecentes.forEach((mov) => maquinasConcluidas.add(mov.maquinaId));
    }

    const maquinasPendentes = [];
    roteiro.lojas.forEach((loja) => {
      loja.maquinas.forEach((maquina) => {
        if (!maquinasConcluidas.has(maquina.id)) {
          maquinasPendentes.push({
            maquinaId: maquina.id,
            maquinaNome: maquina.nome,
            lojaId: loja.id,
            lojaNome: loja.nome,
          });
        }
      });
    });

    const usuarioEstoqueId = roteiro.funcionarioId || null;
    const totalEstoqueFinal = await obterTotalEstoqueUsuario(usuarioEstoqueId);

    const finalizacaoDia = await RoteiroFinalizacaoDiaria.findOne({
      where: {
        roteiroId,
        data: dataHoje,
      },
    });

    const estoqueInicialTotal =
      finalizacaoDia?.estoqueInicialTotal !== null &&
      finalizacaoDia?.estoqueInicialTotal !== undefined
        ? Number(finalizacaoDia.estoqueInicialTotal)
        : totalEstoqueFinal;

    const estoqueAdicionalTotal = await obterEstoqueAdicionalRota({
      usuarioId: usuarioEstoqueId,
      roteiroId,
      dataHoje,
    });

    const consumoTotalProdutos =
      estoqueInicialTotal !== null && totalEstoqueFinal !== null
        ? Math.max(
            0,
            Number(estoqueInicialTotal) + Number(estoqueAdicionalTotal || 0) - Number(totalEstoqueFinal),
          )
        : null;

    console.info({
      evento: "roteiro_consumo_produtos_resumo",
      requestId,
      roteiroId,
      data: dataHoje,
      usuarioIdReferencia: usuarioEstoqueId,
      estoqueInicialTotal,
      estoqueFinalTotal: totalEstoqueFinal,
      consumoTotalProdutos,
    });

    await RoteiroFinalizacaoDiaria.upsert({
      roteiroId,
      data: dataHoje,
      finalizado: true,
      finalizadoPorId: req.usuario?.id || null,
      finalizadoEm: new Date(),
      estoqueInicialTotal,
      estoqueFinalTotal: totalEstoqueFinal,
      consumoTotalProdutos,
    });

    const execucaoSemanal = await RoteiroExecucaoSemanal.findOne({
      where: { roteiroId },
    });
    if (execucaoSemanal) {
      await execucaoSemanal.update({
        emAndamento: false,
        finalizadoEm: new Date(),
      });
    } else {
      await RoteiroExecucaoSemanal.create({
        roteiroId,
        usuarioId: req.usuario?.id || null,
        dataInicio: dataHoje,
        iniciadoEm: new Date(),
        emAndamento: false,
        finalizadoEm: new Date(),
      });
    }

    const lojasResumo = roteiro.lojas.map((loja) => {
      const maquinas = (loja.maquinas || []).map((maquina) => ({
        nome: maquina.nome,
        status: maquinasConcluidas.has(maquina.id) ? "finalizado" : "pendente",
      }));

      const lojaFinalizada =
        maquinas.length > 0 && maquinas.every((maquina) => maquina.status === "finalizado");

      return {
        nome: loja.nome,
        status: lojaFinalizada ? "finalizado" : "pendente",
        maquinas,
      };
    });

    const resumoExecucaoPersistido = await fecharResumoExecucao({
      roteiroId,
      data: dataHoje,
      fechadoPorId: req.usuario?.id || null,
      roteiroNome: roteiro.nome,
      lojas: lojasResumo,
      estoqueInicialTotal,
      estoqueFinalTotal: totalEstoqueFinal,
      consumoTotalProdutos,
    });

    // Ao finalizar a rota, reseta o estado de quebra de ordem para todos os pontos.
    await Promise.all(
      roteiro.lojas.map((loja) =>
        RoteiroPontoPulado.upsert({
          roteiroId,
          lojaId: loja.id,
          data: dataHoje,
          foiPulado: false,
          justificativaEnviada: false,
          justificativa: null,
          primeiraQuebraEm: null,
          ultimaQuebraEm: null,
          primeiroUsuarioId: null,
          ultimoUsuarioId: null,
        }),
      ),
    );

    const mensagemResumoWhatsapp = await montarMensagemResumoWhatsapp(
      resumoExecucaoPersistido,
    );

    let alerta = null;
    if (maquinasPendentes.length > 0) {
      alerta = await criarAlertaRoteiroPendente({
        roteiroId,
        roteiroNome: roteiro.nome,
        maquinasPendentes,
        resumoMensagem: mensagemResumoWhatsapp,
      });
    }

    return res.json({
      success: true,
      status: "finalizado",
      data: dataHoje,
      pendencias: maquinasPendentes,
      resumoConsumoProdutos: {
        usuarioIdReferencia: usuarioEstoqueId,
        estoqueInicialTotal,
        estoqueFinalTotal: totalEstoqueFinal,
        consumoTotalProdutos,
      },
      resumoExecucaoPersistido,
      mensagemResumoWhatsapp,
      resumoTextoCopiar: mensagemResumoWhatsapp,
      alertaWhatsApp: alerta
        ? {
            id: alerta.id,
            status: alerta.status,
            erro: alerta.erro,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro ao finalizar roteiro:", error);
    return res.status(500).json({ error: "Erro ao finalizar roteiro" });
  }
};

export const desfinalizarRoteiro = async (req, res) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    const roteiroId = req.params.id;
    const dataHoje = new Date().toISOString().slice(0, 10);
    const requestId = getRequestId(req);
    const userId = req.usuario.id;
    const role = req.usuario.role;

    const roteiro = await Roteiro.findByPk(roteiroId, {
      attributes: ["id", "funcionarioId"],
    });

    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    const roteiroFuncionarioId = roteiro.funcionarioId || null;
    const { autorizado, motivo } = validarPermissaoFinalizacao({
      userId,
      role,
      roteiroFuncionarioId,
    });

    if (!autorizado) {
      logFinalizacaoForbidden({
        requestId,
        userId,
        role,
        roteiroId,
        roteiroFuncionarioId,
        motivo,
      });

      return responderForbiddenFinalizacao(res, motivo);
    }

    const finalizacaoDia = await RoteiroFinalizacaoDiaria.findOne({
      where: {
        roteiroId,
        data: dataHoje,
        finalizado: true,
      },
    });

    if (!finalizacaoDia) {
      return res.status(409).json({
        error: "Roteiro não está finalizado hoje",
      });
    }

    await RoteiroFinalizacaoDiaria.upsert({
      roteiroId,
      data: dataHoje,
      finalizado: false,
      finalizadoPorId: null,
      finalizadoEm: null,
      estoqueInicialTotal: finalizacaoDia.estoqueInicialTotal,
      estoqueFinalTotal: null,
      consumoTotalProdutos: null,
    });

    const execucaoSemanal = await RoteiroExecucaoSemanal.findOne({
      where: { roteiroId },
    });
    if (execucaoSemanal) {
      await execucaoSemanal.update({
        emAndamento: true,
        finalizadoEm: null,
      });
    } else {
      await RoteiroExecucaoSemanal.create({
        roteiroId,
        usuarioId: req.usuario?.id || null,
        dataInicio: dataHoje,
        iniciadoEm: new Date(),
        emAndamento: true,
        finalizadoEm: null,
      });
    }

    return res.json({
      success: true,
      status: "pendente",
      data: dataHoje,
      message: "Roteiro desfinalizado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao desfinalizar roteiro:", error);
    return res.status(500).json({ error: "Erro ao desfinalizar roteiro" });
  }
};

export const apagarRoteiro = async (req, res) => {
  try {
    const { id: roteiroId } = req.params;

    const roteiro = await Roteiro.findByPk(roteiroId);
    if (!roteiro) {
      return res.status(404).json({ error: "Roteiro não encontrado" });
    }

    await sequelize.transaction(async (transaction) => {
      await Promise.all([
        RoteiroLoja.destroy({
          where: { RoteiroId: roteiroId },
          transaction,
        }),
        RoteiroFinalizacaoDiaria.destroy({
          where: { roteiroId },
          transaction,
        }),
        RoteiroExecucaoSemanal.destroy({
          where: { roteiroId },
          transaction,
        }),
        GastoRoteiro.destroy({
          where: { roteiroId },
          transaction,
        }),
        LogOrdemRoteiro.destroy({
          where: { roteiroId },
          transaction,
        }),
        MovimentacaoStatusDiario.destroy({
          where: { roteiro_id: roteiroId },
          transaction,
        }),
      ]);

      await Promise.all([
        Movimentacao.update(
          { roteiroId: null },
          { where: { roteiroId }, transaction },
        ),
        MovimentacaoVeiculo.update(
          { roteiroId: null },
          { where: { roteiroId }, transaction },
        ),
        Manutencao.update(
          { roteiroId: null },
          { where: { roteiroId }, transaction },
        ),
        ManutencaoWhatsAppPrompt.update(
          { roteiroId: null },
          { where: { roteiroId }, transaction },
        ),
      ]);

      await roteiro.destroy({ transaction });
    });

    return res.json({ success: true, message: "Roteiro apagado com sucesso" });
  } catch (error) {
    console.error("Erro ao apagar roteiro:", error);
    return res.status(500).json({ error: "Erro ao apagar roteiro" });
  }
};
