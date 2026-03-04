import {
  Roteiro,
  Loja,
  Usuario,
  Maquina,
  RoteiroFinalizacaoDiaria,
} from "../models/index.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import { criarAlertaRoteiroPendente } from "../services/whatsappAlertaService.js";

const DIAS_VALIDOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

export const criarRoteiro = async (req, res) => {
  try {
    const { nome, diasSemana } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
    if (diasSemana !== undefined) {
      if (!Array.isArray(diasSemana))
        return res.status(400).json({ error: "diasSemana deve ser um array" });
      const invalidos = diasSemana.filter((d) => !DIAS_VALIDOS.includes(d));
      if (invalidos.length > 0)
        return res.status(400).json({
          error: `Dias inválidos: ${invalidos.join(", ")}. Use: ${DIAS_VALIDOS.join(", ")}`,
        });
    }
    const roteiro = await Roteiro.create({ nome, diasSemana: diasSemana ?? [] });
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

    if (Object.keys(updateData).length === 0)
      return res.status(400).json({ error: "Nenhum campo válido para atualizar" });

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
    const { funcionarioId, funcionarioNome } = req.body;
    const roteiro = await Roteiro.findByPk(req.params.id);
    if (!roteiro)
      return res.status(404).json({ error: "Roteiro não encontrado" });
    await roteiro.update({ funcionarioId, funcionarioNome });
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
    const roteiroId = req.params.id;
    const dataHoje = new Date().toISOString().slice(0, 10);

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

    const statusMaquinas = await MovimentacaoStatusDiario.findAll({
      where: {
        roteiro_id: roteiroId,
        data: dataHoje,
        concluida: true,
      },
    });

    const maquinasConcluidas = new Set(
      statusMaquinas.map((item) => item.maquina_id),
    );

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

    await RoteiroFinalizacaoDiaria.upsert({
      roteiroId,
      data: dataHoje,
      finalizado: true,
      finalizadoPorId: req.usuario?.id || null,
      finalizadoEm: new Date(),
    });

    let alerta = null;
    if (maquinasPendentes.length > 0) {
      alerta = await criarAlertaRoteiroPendente({
        roteiroId,
        roteiroNome: roteiro.nome,
        maquinasPendentes,
      });
    }

    return res.json({
      success: true,
      status: "finalizado",
      data: dataHoje,
      pendencias: maquinasPendentes,
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
