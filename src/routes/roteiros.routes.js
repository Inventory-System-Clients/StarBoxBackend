import express from "express";
import {
  Roteiro,
  Loja,
  Usuario,
  Maquina,
  Veiculo,
  RoteiroLoja,
  LogOrdemRoteiro,
  RoteiroPontoPulado,
  RoteiroFinalizacaoDiaria,
  MovimentacaoVeiculo,
} from "../models/index.js";
import { sequelize } from "../database/connection.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import justificativasPendentes from "../utils/justificativasPendentes.js";
import {
  finalizarRoteiro,
  desfinalizarRoteiro,
  criarRoteiro,
  atualizarDiasSemana,
  apagarRoteiro,
} from "../controllers/roteiroController.js";
import {
  listarGastosRoteiro,
  registrarGastoRoteiro,
  atualizarOrcamentoDiarioRoteiro,
} from "../controllers/gastoRoteiroController.js";
import { Op, literal } from "sequelize";

const router = express.Router();

const ROLES_GESTAO_ROTEIROS = ["ADMIN", "GERENCIADOR"];

const roteiroFoiFinalizadoHoje = async (roteiroId, transaction) => {
  if (!roteiroId) return false;

  const dataHoje = new Date().toISOString().slice(0, 10);
  const finalizacao = await RoteiroFinalizacaoDiaria.findOne({
    where: {
      roteiroId,
      data: dataHoje,
      finalizado: true,
    },
    transaction,
  });

  return Boolean(finalizacao);
};

const getDataHoje = () => new Date().toISOString().slice(0, 10);

const pontoFoiJustificadoNoDia = (pontoPulado) =>
  Boolean(pontoPulado?.foiPulado && pontoPulado?.justificativaEnviada);

const normalizarId = (id) => String(id || "").trim();

const obterContextoOrdemRoteiro = async (roteiroId) => {
  const lojasRoteiro = await RoteiroLoja.findAll({
    where: { RoteiroId: roteiroId },
    order: [["ordem", "ASC"]],
  });

  const lojaIds = lojasRoteiro.map((rel) => rel.LojaId).filter(Boolean);
  if (lojaIds.length === 0) {
    return [];
  }

  const lojas = await Loja.findAll({
    where: { id: lojaIds },
    include: [{ model: Maquina, as: "maquinas", attributes: ["id", "nome"] }],
  });

  const lojasPorId = new Map(lojas.map((loja) => [normalizarId(loja.id), loja]));

  const MovimentacaoStatusDiario = (
    await import("../models/MovimentacaoStatusDiario.js")
  ).default;

  const statusConcluido = await MovimentacaoStatusDiario.findAll({
    where: { roteiro_id: roteiroId, concluida: true },
  });
  const maquinasConcluidas = new Set(statusConcluido.map((s) => s.maquina_id));

  return lojasRoteiro
    .map((rel) => {
      const loja = lojasPorId.get(normalizarId(rel.LojaId));
      if (!loja) return null;

      const temPendencia = (loja.maquinas || []).some(
        (m) => !maquinasConcluidas.has(m.id),
      );

      return {
        id: loja.id,
        nome: loja.nome,
        ordem: rel.ordem,
        temPendencia,
      };
    })
    .filter(Boolean);
};

const obterLojaEsperadaPendente = async (roteiroId) => {
  const contexto = await obterContextoOrdemRoteiro(roteiroId);
  return contexto.find((item) => item.temPendencia) || null;
};

// Criar novo roteiro (aceita diasSemana opcionalmente)
router.post("/", autenticar, autorizar(ROLES_GESTAO_ROTEIROS), criarRoteiro);

// Listar roteiros
router.get("/", async (req, res) => {
  try {
    const roteiros = await Roteiro.findAll({
      include: [
        { model: Usuario, as: "funcionario", attributes: ["id", "nome"] },
        {
          model: Veiculo,
          as: "veiculo",
          attributes: ["id", "nome", "modelo", "tipo", "emoji"],
        },
        {
          model: Loja,
          as: "lojas",
          attributes: ["id", "nome"],
          through: { attributes: ["ordem"] },
        },
      ],
    });
    res.json(roteiros);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar roteiros" });
  }
});

// Iniciar roteiro
router.post(
  "/:id/iniciar",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  async (req, res) => {
    try {
      const { funcionarioId, funcionarioNome, veiculoId, kmInicialVeiculo } = req.body;
      console.log("[INICIAR] body:", {
        funcionarioId,
        funcionarioNome,
        veiculoId,
        kmInicialVeiculo,
      });
      const roteiro = await Roteiro.findByPk(req.params.id);
      if (!roteiro)
        return res.status(404).json({ error: "Roteiro não encontrado" });

      const veiculoIdNormalizado = veiculoId === "" ? null : veiculoId;
      let kmInicialNumerico = null;

      if (
        kmInicialVeiculo !== undefined &&
        kmInicialVeiculo !== null &&
        String(kmInicialVeiculo).trim() !== ""
      ) {
        const kmConvertido = Number.parseInt(kmInicialVeiculo, 10);
        if (!Number.isInteger(kmConvertido) || kmConvertido < 0) {
          return res.status(400).json({
            error: "kmInicialVeiculo deve ser um número inteiro maior ou igual a zero",
          });
        }
        kmInicialNumerico = kmConvertido;
      }

      if (veiculoIdNormalizado) {
        const veiculo = await Veiculo.findByPk(veiculoIdNormalizado);
        if (!veiculo)
          return res.status(404).json({ error: "Veículo não encontrado" });

        const dataHoje = getDataHoje();
        const retiradaDia = await MovimentacaoVeiculo.findOne({
          where: {
            roteiroId: roteiro.id,
            veiculoId: veiculoIdNormalizado,
            tipo: "retirada",
            dataHora: {
              [Op.between]: [
                new Date(`${dataHoje}T00:00:00.000Z`),
                new Date(`${dataHoje}T23:59:59.999Z`),
              ],
            },
          },
          order: [["dataHora", "ASC"]],
        });

        if (kmInicialNumerico === null && !retiradaDia) {
          return res.status(400).json({
            error:
              "kmInicialVeiculo é obrigatório para iniciar roteiro com veículo quando não existe retirada registrada no dia",
          });
        }

        if (kmInicialNumerico !== null) {
          const ultimaMovimentacaoComKm = await MovimentacaoVeiculo.findOne({
            where: {
              veiculoId: veiculoIdNormalizado,
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

          if (kmInicialNumerico < kmReferencia) {
            return res.status(400).json({
              error: `O KM inicial informado (${kmInicialNumerico}) não pode ser menor que o KM anterior (${kmReferencia}).`,
              kmReferencia,
            });
          }

          await MovimentacaoVeiculo.create({
            veiculoId: veiculoIdNormalizado,
            usuarioId: req.usuario.id,
            tipo: "retirada",
            dataHora: new Date(),
            km: kmInicialNumerico,
            roteiroId: roteiro.id,
            obs: "Retirada registrada no início do roteiro",
          });

          if (kmInicialNumerico > Number(veiculo.km || 0)) {
            await veiculo.update({ km: kmInicialNumerico });
          }
        }
      }

      const update = {};
      if (funcionarioId !== undefined) update.funcionarioId = funcionarioId;
      if (funcionarioNome !== undefined)
        update.funcionarioNome = funcionarioNome;
      if (veiculoId !== undefined) update.veiculoId = veiculoIdNormalizado;

      const result = await roteiro.update(update);
      console.log("[INICIAR] após update:", {
        funcionarioId: result.funcionarioId,
        funcionarioNome: result.funcionarioNome,
        veiculoId: result.veiculoId,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("[INICIAR] erro:", error);
      res.status(500).json({ error: "Erro ao iniciar roteiro" });
    }
  },
);

// Gastos semanais no roteiro (execução)
router.get("/:id/gastos", autenticar, listarGastosRoteiro);
router.post("/:id/gastos", autenticar, registrarGastoRoteiro);

// Orçamento semanal do roteiro (ADMIN e GERENCIADOR)
router.patch(
  "/:id/orcamento-semanal",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  atualizarOrcamentoDiarioRoteiro,
);

// Compatibilidade: endpoint legado de orçamento diário
router.patch(
  "/:id/orcamento-diario",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  atualizarOrcamentoDiarioRoteiro,
);

router.post("/:id/finalizar", autenticar, finalizarRoteiro);
router.post("/:id/desfinalizar", autenticar, desfinalizarRoteiro);

// Mover loja entre roteiros
router.post(
  "/mover-loja",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  async (req, res) => {
    try {
      const { lojaId, roteiroOrigemId, roteiroDestinoId } = req.body;
      console.log("[MOVER-LOJA] body:", {
        lojaId,
        roteiroOrigemId,
        roteiroDestinoId,
      });

      const roteiroDestino = await Roteiro.findByPk(roteiroDestinoId);
      console.log(
        "[MOVER-LOJA] roteiroDestino:",
        roteiroDestino?.id ?? "NÃO ENCONTRADO",
      );
      if (!roteiroDestino)
        return res
          .status(404)
          .json({ error: "Roteiro de destino não encontrado" });

      await sequelize.transaction(async (t) => {
        const destinoFinalizado = await roteiroFoiFinalizadoHoje(
          roteiroDestinoId,
          t,
        );
        if (destinoFinalizado) {
          throw Object.assign(
            new Error(
              "Roteiro de destino finalizado: não é permitido adicionar lojas.",
            ),
            { status: 409 },
          );
        }

        if (roteiroOrigemId) {
          const origemFinalizado = await roteiroFoiFinalizadoHoje(
            roteiroOrigemId,
            t,
          );
          if (origemFinalizado) {
            throw Object.assign(
              new Error(
                "Roteiro de origem finalizado: não é permitido remover ou mover lojas.",
              ),
              { status: 409 },
            );
          }

          const roteiroOrigem = await Roteiro.findByPk(roteiroOrigemId);
          console.log(
            "[MOVER-LOJA] roteiroOrigem:",
            roteiroOrigem?.id ?? "NÃO ENCONTRADO",
          );
          if (!roteiroOrigem)
            throw Object.assign(new Error("Roteiro de origem não encontrado"), {
              status: 404,
            });

          const destroyResult = await RoteiroLoja.destroy({
            where: { RoteiroId: roteiroOrigemId, LojaId: lojaId },
            transaction: t,
          });
          console.log(
            "[MOVER-LOJA] registros removidos da origem:",
            destroyResult,
          );

          const lojasOrigem = await RoteiroLoja.findAll({
            where: { RoteiroId: roteiroOrigemId },
            order: [["ordem", "ASC"]],
            transaction: t,
          });
          console.log(
            "[MOVER-LOJA] lojas restantes na origem:",
            lojasOrigem.length,
          );
          for (let i = 0; i < lojasOrigem.length; i++) {
            await lojasOrigem[i].update({ ordem: i }, { transaction: t });
          }
        }

        const maxOrdem = await RoteiroLoja.max("ordem", {
          where: { RoteiroId: roteiroDestinoId },
          transaction: t,
        });
        const novaOrdem = maxOrdem != null ? maxOrdem + 1 : 0;
        console.log("[MOVER-LOJA] novaOrdem no destino:", novaOrdem);

        const existente = await RoteiroLoja.findOne({
          where: { RoteiroId: roteiroDestinoId, LojaId: lojaId },
          transaction: t,
        });
        console.log("[MOVER-LOJA] loja já existe no destino?", !!existente);

        if (existente) {
          await existente.update({ ordem: novaOrdem }, { transaction: t });
        } else {
          const criado = await RoteiroLoja.create(
            { RoteiroId: roteiroDestinoId, LojaId: lojaId, ordem: novaOrdem },
            { transaction: t },
          );
          console.log(
            "[MOVER-LOJA] registro criado:",
            criado?.RoteiroId,
            criado?.LojaId,
          );
        }
      });

      console.log("[MOVER-LOJA] sucesso");
      res.json({ success: true });
    } catch (error) {
      if (error.status === 404)
        return res.status(404).json({ error: error.message });
      if (error.status === 409)
        return res.status(409).json({ error: error.message });
      console.error("[MOVER-LOJA] ERRO COMPLETO:", error);
      console.error("[MOVER-LOJA] message:", error.message);
      console.error("[MOVER-LOJA] stack:", error.stack);
      res
        .status(500)
        .json({
          error: "Erro ao mover/adicionar loja",
          detalhe: error.message,
        });
    }
  },
);

// Reordenar loja dentro do roteiro (ADMIN e GERENCIADOR)
router.patch(
  "/:id/reordenar-loja",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  async (req, res) => {
    try {
      const { id: roteiroId } = req.params;
      const { lojaId, novaOrdem } = req.body;

      const roteiroFinalizado = await roteiroFoiFinalizadoHoje(roteiroId);
      if (roteiroFinalizado) {
        return res.status(409).json({
          error: "Roteiro finalizado: não é permitido reordenar lojas.",
        });
      }

      if (lojaId == null || novaOrdem == null)
        return res
          .status(400)
          .json({ error: "lojaId e novaOrdem s\u00e3o obrigat\u00f3rios" });

      const relacaoAtual = await RoteiroLoja.findOne({
        where: { RoteiroId: roteiroId, LojaId: lojaId },
      });
      if (!relacaoAtual)
        return res
          .status(404)
          .json({ error: "Loja n\u00e3o encontrada no roteiro" });

      await sequelize.transaction(async (t) => {
        const todasLojas = await RoteiroLoja.findAll({
          where: { RoteiroId: roteiroId },
          order: [["ordem", "ASC"]],
          transaction: t,
        });

        // Remove a loja da posição atual e insere na nova posição
        const semLoja = todasLojas.filter((l) => l.LojaId !== lojaId);
        const novaOrdemClamped = Math.max(
          0,
          Math.min(novaOrdem, semLoja.length),
        );
        semLoja.splice(novaOrdemClamped, 0, relacaoAtual);

        for (let i = 0; i < semLoja.length; i++) {
          await semLoja[i].update({ ordem: i }, { transaction: t });
        }
      });

      res.json({ success: true, message: "Loja reordenada com sucesso" });
    } catch (error) {
      console.error("Erro ao reordenar loja:", error);
      res.status(500).json({ error: "Erro ao reordenar loja" });
    }
  },
);

// Registrar justificativa quando funcionário pula a ordem de lojas
router.post("/:id/justificar-ordem", autenticar, async (req, res) => {
  try {
    const { id: roteiroId } = req.params;
    const { lojaId, justificativa, lojaPuladaId } = req.body;
    const usuarioId = req.usuario.id;

    if (!justificativa || justificativa.trim() === "")
      return res
        .status(400)
        .json({ error: "Justificativa \u00e9 obrigat\u00f3ria" });
    if (!lojaId)
      return res.status(400).json({ error: "lojaId \u00e9 obrigat\u00f3rio" });

    let lojaEsperadaId = null;
    let lojaEsperadaNome = null;
    let lojaNome = null;
    const contextoOrdem = await obterContextoOrdemRoteiro(roteiroId);
    const lojaPuladaInfo = lojaPuladaId
      ? contextoOrdem.find(
          (item) => normalizarId(item.id) === normalizarId(lojaPuladaId),
        )
      : null;

    if (lojaPuladaInfo?.temPendencia) {
      lojaEsperadaId = lojaPuladaInfo.id;
      lojaEsperadaNome = lojaPuladaInfo.nome;
    } else {
      const lojaEsperada = contextoOrdem.find((item) => item.temPendencia);
      if (lojaEsperada) {
        lojaEsperadaId = lojaEsperada.id;
        lojaEsperadaNome = lojaEsperada.nome;
      }
    }

    // Nome da loja visitada
    const lojaSelecionada = await Loja.findByPk(lojaId);
    lojaNome = lojaSelecionada ? lojaSelecionada.nome : null;

    await LogOrdemRoteiro.create({
      roteiroId,
      lojaId,
      usuarioId,
      lojaEsperadaId,
      lojaSelecionadaId: lojaId,
      justificativa: justificativa.trim(),
      lojaEsperadaNome,
      lojaNome,
    });

    const dataHoje = getDataHoje();
    if (lojaEsperadaId) {
      const pontoPulado = await RoteiroPontoPulado.findOne({
        where: {
          roteiroId,
          lojaId: lojaEsperadaId,
          data: dataHoje,
        },
      });

      if (!pontoPulado) {
        await RoteiroPontoPulado.create({
          roteiroId,
          lojaId: lojaEsperadaId,
          data: dataHoje,
          foiPulado: true,
          justificativaEnviada: true,
          justificativa: justificativa.trim(),
          primeiraQuebraEm: new Date(),
          ultimaQuebraEm: new Date(),
          primeiroUsuarioId: usuarioId,
          ultimoUsuarioId: usuarioId,
        });
      } else {
        await pontoPulado.update({
          foiPulado: true,
          justificativaEnviada: true,
          justificativa: justificativa.trim(),
          ultimaQuebraEm: new Date(),
          ultimoUsuarioId: usuarioId,
          primeiraQuebraEm: pontoPulado.primeiraQuebraEm || new Date(),
          primeiroUsuarioId: pontoPulado.primeiroUsuarioId || usuarioId,
        });
      }
    }

    // Armazenar para ser aplicada na próxima movimentação desta loja
    justificativasPendentes.set(lojaId, {
      justificativa: justificativa.trim(),
      roteiroId,
      lojaEsperadaId,
      lojaEsperadaNome,
      lojaNome,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: "Justificativa registrada com sucesso",
      lojaEsperadaId,
      lojaEsperadaNome,
      lojaId,
      lojaNome,
      justificativa: justificativa.trim(),
    });
  } catch (error) {
    console.error("Erro ao salvar justificativa:", error);
    res.status(500).json({ error: "Erro ao salvar justificativa" });
  }
});

// Verificar se precisa pedir justificativa de quebra de ordem para a loja selecionada
router.get("/:id/quebra-ordem/status", autenticar, async (req, res) => {
  try {
    const { id: roteiroId } = req.params;
    const { lojaId, lojaAtualId } = req.query;

    if (!lojaId) {
      return res.status(400).json({ error: "lojaId é obrigatório" });
    }

    const dataHoje = getDataHoje();
    const contextoOrdem = await obterContextoOrdemRoteiro(roteiroId);
    const idsOrdenados = contextoOrdem.map((item) => normalizarId(item.id));
    const idDestino = normalizarId(lojaId);
    const idAtual = normalizarId(lojaAtualId);

    if (idAtual) {
      const indiceAtual = idsOrdenados.indexOf(idAtual);
      const indiceDestino = idsOrdenados.indexOf(idDestino);

      if (indiceAtual >= 0 && indiceDestino >= 0 && indiceDestino > indiceAtual + 1) {
        const lojasIntermediarias = contextoOrdem.slice(
          indiceAtual + 1,
          indiceDestino,
        );

        const lojasIntermediariasComPendencia = lojasIntermediarias.filter(
          (item) => item.temPendencia,
        );

        const pontosIntermediarios =
          lojasIntermediariasComPendencia.length > 0
            ? await RoteiroPontoPulado.findAll({
                where: {
                  roteiroId,
                  data: dataHoje,
                  lojaId: {
                    [Op.in]: lojasIntermediariasComPendencia.map((item) => item.id),
                  },
                },
              })
            : [];

        const pontoIntermediarioPorLojaId = new Map(
          pontosIntermediarios.map((item) => [normalizarId(item.lojaId), item]),
        );

        const proximaLojaPuladaSemJustificativa = lojasIntermediariasComPendencia.find(
          (item) => {
            const ponto = pontoIntermediarioPorLojaId.get(normalizarId(item.id));
            return !pontoFoiJustificadoNoDia(ponto);
          },
        );

        if (proximaLojaPuladaSemJustificativa) {
          const pontoPulado = pontoIntermediarioPorLojaId.get(
            normalizarId(proximaLojaPuladaSemJustificativa.id),
          );

          return res.json({
            precisaJustificativa: true,
            motivo: "loja_pulada_sem_justificativa",
            lojaEsperadaId: proximaLojaPuladaSemJustificativa.id,
            lojaEsperadaNome: proximaLojaPuladaSemJustificativa.nome,
            lojaSelecionadaId: lojaId,
            lojaSelecionadaNome: null,
            lojaAtualId: lojaAtualId || null,
            data: dataHoje,
            pontoPulado: pontoPulado || null,
          });
        }

        return res.json({
          precisaJustificativa: false,
          motivo: "ponto_selecionado_ja_justificado",
          lojaSelecionadaId: lojaId,
          lojaAtualId: lojaAtualId || null,
          data: dataHoje,
        });
      }
    }

    const lojaEsperada = await obterLojaEsperadaPendente(roteiroId);
    if (!lojaEsperada) {
      return res.json({
        precisaJustificativa: false,
        motivo: "sem_pendencia_na_ordem",
      });
    }

    if (String(lojaEsperada.id) === String(lojaId)) {
      return res.json({
        precisaJustificativa: false,
        motivo: "na_ordem_correta",
        lojaEsperadaId: lojaEsperada.id,
        lojaEsperadaNome: lojaEsperada.nome,
      });
    }

    const pontoEsperado = await RoteiroPontoPulado.findOne({
      where: {
        roteiroId,
        lojaId: lojaEsperada.id,
        data: dataHoje,
      },
    });

    const justificativaJaEnviada = pontoFoiJustificadoNoDia(pontoEsperado);

    return res.json({
      precisaJustificativa: !justificativaJaEnviada,
      motivo: justificativaJaEnviada
        ? "ponto_selecionado_ja_justificado"
        : "loja_pulada_sem_justificativa",
      lojaEsperadaId: lojaEsperada.id,
      lojaEsperadaNome: lojaEsperada.nome,
      lojaSelecionadaId: lojaId,
      lojaSelecionadaNome: null,
      data: dataHoje,
      pontoPulado: pontoEsperado || null,
    });
  } catch (error) {
    console.error("Erro ao verificar status de quebra de ordem:", error);
    return res
      .status(500)
      .json({ error: "Erro ao verificar status de quebra de ordem" });
  }
});

// Atualizar campos do roteiro (diasSemana, nome, observacao, funcionarioId, funcionarioNome, veiculoId)
router.patch(
  "/:id",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  async (req, res) => {
    try {
      const roteiro = await Roteiro.findByPk(req.params.id);
      if (!roteiro)
        return res.status(404).json({ error: "Roteiro não encontrado" });

      const camposPermitidos = [
        "diasSemana",
        "nome",
        "observacao",
        "funcionarioId",
        "funcionarioNome",
        "veiculoId",
      ];
      const update = {};
      camposPermitidos.forEach((c) => {
        if (req.body[c] !== undefined) update[c] = req.body[c];
      });

      if (update.observacao !== undefined) {
        if (typeof update.observacao !== "string") {
          return res
            .status(400)
            .json({ error: "observacao deve ser um texto" });
        }
        update.observacao = update.observacao.trim() || null;
      }

      if (update.veiculoId !== undefined) {
        const veiculoIdNormalizado =
          update.veiculoId === "" ? null : update.veiculoId;
        if (veiculoIdNormalizado) {
          const veiculo = await Veiculo.findByPk(veiculoIdNormalizado);
          if (!veiculo)
            return res.status(404).json({ error: "Veículo não encontrado" });
        }
        update.veiculoId = veiculoIdNormalizado;
      }

      await roteiro.update(update);
      res.json(roteiro);
    } catch (error) {
      console.error("Erro ao atualizar roteiro:", error);
      res.status(500).json({ error: "Erro ao atualizar roteiro" });
    }
  },
);

// Apagar roteiro (ADMIN e GERENCIADOR)
router.delete(
  "/:id",
  autenticar,
  autorizar(ROLES_GESTAO_ROTEIROS),
  apagarRoteiro,
);

// Roteiros do dia corrente: GET /roteiros/do-dia?dia=SEG
router.get("/do-dia", autenticar, async (req, res) => {
  try {
    const DIAS_VALIDOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];
    const { dia } = req.query;
    if (!dia || !DIAS_VALIDOS.includes(dia.toUpperCase()))
      return res.status(400).json({
        error: `Parâmetro 'dia' obrigatório. Use um de: ${DIAS_VALIDOS.join(", ")}`,
      });
    const diaUpper = dia.toUpperCase();
    const roteiros = await Roteiro.findAll({
      where: literal(`"Roteiros"."dias_semana"::jsonb @> '"${diaUpper}"'`),
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
    console.error("Erro ao filtrar roteiros por dia:", error);
    res.status(500).json({ error: "Erro ao filtrar roteiros por dia" });
  }
});

// Endpoint para buscar todos os roteiros com status
import { getTodosRoteirosComStatus } from "../controllers/roteiroExecucaoController.js";
router.get("/com-status", getTodosRoteirosComStatus);

// Página de execução de roteiro: retorna lojas e máquinas do roteiro
import {
  getRoteiroExecucaoComStatus,
  getResumoExecucaoPersistido,
} from "../controllers/roteiroExecucaoController.js";

router.get("/:id/executar", autenticar, getRoteiroExecucaoComStatus);
router.get("/:id/resumo-execucao", autenticar, getResumoExecucaoPersistido);

export default router;
