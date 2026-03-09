import express from "express";
import { Roteiro, Loja, Usuario, Maquina, RoteiroLoja, LogOrdemRoteiro } from "../models/index.js";
import { sequelize } from "../database/connection.js";
import { autenticar, autorizar } from "../middlewares/auth.js";
import { finalizarRoteiro, criarRoteiro, atualizarDiasSemana } from "../controllers/roteiroController.js";
import { Op, literal } from "sequelize";

const router = express.Router();

// Criar novo roteiro (aceita diasSemana opcionalmente)
router.post("/", autenticar, autorizar("ADMIN"), criarRoteiro);

// Listar roteiros
router.get("/", async (req, res) => {
  try {
    const roteiros = await Roteiro.findAll({
      include: [
        { model: Usuario, as: "funcionario", attributes: ["id", "nome"] },
        { model: Loja, as: "lojas", attributes: ["id", "nome"], through: { attributes: ["ordem"] } },
      ],
    });
    res.json(roteiros);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar roteiros" });
  }
});

// Iniciar roteiro
router.post("/:id/iniciar", async (req, res) => {
  try {
    const { funcionarioId, funcionarioNome } = req.body;
    console.log("[INICIAR] body:", { funcionarioId, funcionarioNome });
    const roteiro = await Roteiro.findByPk(req.params.id);
    if (!roteiro)
      return res.status(404).json({ error: "Roteiro não encontrado" });
    const result = await roteiro.update({ funcionarioId, funcionarioNome });
    console.log("[INICIAR] após update:", { funcionarioId: result.funcionarioId, funcionarioNome: result.funcionarioNome });
    res.json({ success: true });
  } catch (error) {
    console.error("[INICIAR] erro:", error);
    res.status(500).json({ error: "Erro ao iniciar roteiro" });
  }
});

router.post("/:id/finalizar", autenticar, finalizarRoteiro);

// Mover loja entre roteiros
router.post("/mover-loja", async (req, res) => {
  try {
    const { lojaId, roteiroOrigemId, roteiroDestinoId } = req.body;
    const roteiroDestino = await Roteiro.findByPk(roteiroDestinoId);
    if (!roteiroDestino)
      return res.status(404).json({ error: "Roteiro de destino não encontrado" });

    await sequelize.transaction(async (t) => {
      if (roteiroOrigemId) {
        const roteiroOrigem = await Roteiro.findByPk(roteiroOrigemId);
        if (!roteiroOrigem)
          throw Object.assign(new Error("Roteiro de origem não encontrado"), { status: 404 });
        await RoteiroLoja.destroy({ where: { RoteiroId: roteiroOrigemId, LojaId: lojaId }, transaction: t });
        // Reorganizar ordens do roteiro de origem
        const lojasOrigem = await RoteiroLoja.findAll({
          where: { RoteiroId: roteiroOrigemId },
          order: [["ordem", "ASC"]],
          transaction: t,
        });
        for (let i = 0; i < lojasOrigem.length; i++) {
          await lojasOrigem[i].update({ ordem: i }, { transaction: t });
        }
      }
      // Determinar nova ordem (ao final do roteiro destino)
      const maxOrdem = await RoteiroLoja.max("ordem", {
        where: { RoteiroId: roteiroDestinoId },
        transaction: t,
      });
      const novaOrdem = maxOrdem != null ? maxOrdem + 1 : 0;
      const existente = await RoteiroLoja.findOne({
        where: { RoteiroId: roteiroDestinoId, LojaId: lojaId },
        transaction: t,
      });
      if (existente) {
        await existente.update({ ordem: novaOrdem }, { transaction: t });
      } else {
        await RoteiroLoja.create(
          { RoteiroId: roteiroDestinoId, LojaId: lojaId, ordem: novaOrdem },
          { transaction: t }
        );
      }
    });

    res.json({ success: true });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error("Erro ao mover/adicionar loja:", error);
    res.status(500).json({ error: "Erro ao mover/adicionar loja" });
  }
});

// Reordenar loja dentro do roteiro (ADMIN only)
router.patch("/:id/reordenar-loja", autenticar, autorizar("ADMIN"), async (req, res) => {
  try {
    const { id: roteiroId } = req.params;
    const { lojaId, novaOrdem } = req.body;

    if (lojaId == null || novaOrdem == null)
      return res.status(400).json({ error: "lojaId e novaOrdem s\u00e3o obrigat\u00f3rios" });

    const relacaoAtual = await RoteiroLoja.findOne({ where: { RoteiroId: roteiroId, LojaId: lojaId } });
    if (!relacaoAtual)
      return res.status(404).json({ error: "Loja n\u00e3o encontrada no roteiro" });

    await sequelize.transaction(async (t) => {
      const todasLojas = await RoteiroLoja.findAll({
        where: { RoteiroId: roteiroId },
        order: [["ordem", "ASC"]],
        transaction: t,
      });

      // Remove a loja da posição atual e insere na nova posição
      const semLoja = todasLojas.filter((l) => l.LojaId !== lojaId);
      const novaOrdemClamped = Math.max(0, Math.min(novaOrdem, semLoja.length));
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
});

// Registrar justificativa quando funcionário pula a ordem de lojas
router.post("/:id/justificar-ordem", autenticar, async (req, res) => {
  try {
    const { id: roteiroId } = req.params;
    const { lojaId, justificativa } = req.body;
    const usuarioId = req.usuario.id;

    if (!justificativa || justificativa.trim() === "")
      return res.status(400).json({ error: "Justificativa \u00e9 obrigat\u00f3ria" });
    if (!lojaId)
      return res.status(400).json({ error: "lojaId \u00e9 obrigat\u00f3rio" });

    // Determinar loja esperada (primeira pendente na ordem)
    const lojasRoteiro = await RoteiroLoja.findAll({
      where: { RoteiroId: roteiroId },
      order: [["ordem", "ASC"]],
    });

    // Importar aqui para evitar dependência circular — já está no models/index.js
    const MovimentacaoStatusDiario = (await import("../models/MovimentacaoStatusDiario.js")).default;
    const dataHoje = new Date().toISOString().slice(0, 10);
    const statusHoje = await MovimentacaoStatusDiario.findAll({
      where: { roteiro_id: roteiroId, data: dataHoje, concluida: true },
    });
    const maquinasConcluidasHoje = new Set(statusHoje.map((s) => s.maquina_id));

    let lojaEsperadaId = null;
    for (const rel of lojasRoteiro) {
      const loja = await Loja.findByPk(rel.LojaId, {
        include: [{ model: Maquina, as: "maquinas", attributes: ["id"] }],
      });
      if (loja && loja.maquinas.some((m) => !maquinasConcluidasHoje.has(m.id))) {
        lojaEsperadaId = loja.id;
        break;
      }
    }

    await LogOrdemRoteiro.create({
      roteiroId,
      lojaId,
      usuarioId,
      lojaEsperadaId,
      lojaSelecionadaId: lojaId,
      justificativa: justificativa.trim(),
    });

    res.json({ success: true, message: "Justificativa registrada com sucesso" });
  } catch (error) {
    console.error("Erro ao salvar justificativa:", error);
    res.status(500).json({ error: "Erro ao salvar justificativa" });
  }
});

// Atualizar campos do roteiro (diasSemana, nome, funcionarioId, funcionarioNome)
router.patch("/:id", async (req, res) => {
  try {
    const roteiro = await Roteiro.findByPk(req.params.id);
    if (!roteiro) return res.status(404).json({ error: "Roteiro não encontrado" });

    const camposPermitidos = ["diasSemana", "nome", "funcionarioId", "funcionarioNome"];
    const update = {};
    camposPermitidos.forEach((c) => {
      if (req.body[c] !== undefined) update[c] = req.body[c];
    });

    await roteiro.update(update);
    res.json(roteiro);
  } catch (error) {
    console.error("Erro ao atualizar roteiro:", error);
    res.status(500).json({ error: "Erro ao atualizar roteiro" });
  }
});

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
import { getRoteiroExecucaoComStatus } from "../controllers/roteiroExecucaoController.js";

router.get("/:id/executar", getRoteiroExecucaoComStatus);

export default router;
