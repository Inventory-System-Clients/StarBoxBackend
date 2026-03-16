import {
  Roteiro,
  Loja,
  Usuario,
  Maquina,
  RoteiroFinalizacaoDiaria,
  Veiculo,
} from "../models/index.js";
import MovimentacaoStatusDiario from "../models/MovimentacaoStatusDiario.js";
import { criarAlertaRoteiroPendente } from "../services/whatsappAlertaService.js";

const DIAS_VALIDOS = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"];

const parseValorMonetario = (valor) => {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") {
    return Number.parseFloat(valor.replace(",", ".").trim());
  }
  return Number.NaN;
};

export const criarRoteiro = async (req, res) => {
  try {
    const { nome, diasSemana, observacao, orcamentoDiario, veiculoId } =
      req.body;
    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
    if (observacao !== undefined && typeof observacao !== "string") {
      return res
        .status(400)
        .json({ error: "observacao deve ser um texto" });
    }
    if (orcamentoDiario !== undefined) {
      const valorOrcamento = parseValorMonetario(orcamentoDiario);
      if (!Number.isFinite(valorOrcamento) || valorOrcamento <= 0) {
        return res
          .status(400)
          .json({ error: "orcamentoDiario deve ser um número maior que zero" });
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

    const veiculoIdNormalizado = veiculoId === "" ? null : veiculoId ?? null;
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
      ...(orcamentoDiario !== undefined
        ? { orcamentoDiario: Number.parseFloat(parseValorMonetario(orcamentoDiario).toFixed(2)) }
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

    if (outrosCampos.orcamentoDiario !== undefined) {
      const valorOrcamento = parseValorMonetario(outrosCampos.orcamentoDiario);
      if (!Number.isFinite(valorOrcamento) || valorOrcamento <= 0) {
        return res
          .status(400)
          .json({ error: "orcamentoDiario deve ser um número maior que zero" });
      }
      updateData.orcamentoDiario = Number.parseFloat(valorOrcamento.toFixed(2));
    }

    if (outrosCampos.veiculoId !== undefined) {
      const veiculoIdNormalizado =
        outrosCampos.veiculoId === "" ? null : outrosCampos.veiculoId;
      if (veiculoIdNormalizado) {
        const veiculo = await Veiculo.findByPk(veiculoIdNormalizado);
        if (!veiculo)
          return res
            .status(404)
            .json({ error: "Veículo não encontrado" });
      }
      updateData.veiculoId = veiculoIdNormalizado;
    }

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
