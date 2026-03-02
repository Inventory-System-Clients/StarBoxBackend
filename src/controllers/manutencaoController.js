import {
  Manutencao,
  Loja,
  Maquina,
  Usuario,
  Roteiro,
} from "../models/index.js";

const STATUS_PERMITIDOS = [
  "pendente",
  "em_andamento",
  "feito",
  "concluida",
  "cancelada",
];

const normalizarStatus = (status) => {
  if (!status) return undefined;
  return String(status).trim().toLowerCase();
};

const includePadrao = [
  { model: Loja, as: "loja", attributes: ["id", "nome"] },
  { model: Maquina, as: "maquina", attributes: ["id", "nome", "lojaId"] },
  { model: Usuario, as: "funcionario", attributes: ["id", "nome", "email"] },
  { model: Roteiro, as: "roteiro", attributes: ["id", "nome"] },
];

export const listarManutencoes = async (req, res) => {
  try {
    const where = {};
    const status = normalizarStatus(req.query.status);

    if (status) {
      where.status = status;
    }

    if (req.usuario.role !== "ADMIN") {
      where.funcionarioId = req.usuario.id;
    }

    const manutencoes = await Manutencao.findAll({
      where,
      include: includePadrao,
      order: [["createdAt", "DESC"]],
    });

    return res.json(manutencoes);
  } catch (error) {
    console.error("Erro ao listar manutenções:", error);
    return res.status(500).json({ error: "Erro ao listar manutenções" });
  }
};

export const criarManutencao = async (req, res) => {
  try {
    const { descricao, lojaId, maquinaId, funcionarioId, roteiroId } = req.body;

    if (!descricao || !lojaId || !maquinaId) {
      return res.status(400).json({
        error: "Campos obrigatórios: descricao, lojaId e maquinaId",
      });
    }

    const maquina = await Maquina.findByPk(maquinaId);
    if (!maquina) {
      return res.status(404).json({ error: "Máquina não encontrada" });
    }

    if (maquina.lojaId !== lojaId) {
      return res.status(400).json({
        error: "A máquina selecionada não pertence à loja informada",
      });
    }

    if (funcionarioId) {
      const funcionario = await Usuario.findByPk(funcionarioId);
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }
    }

    if (roteiroId) {
      const roteiro = await Roteiro.findByPk(roteiroId);
      if (!roteiro) {
        return res.status(404).json({ error: "Roteiro não encontrado" });
      }
    }

    const manutencao = await Manutencao.create({
      descricao,
      lojaId,
      maquinaId,
      funcionarioId: funcionarioId || null,
      roteiroId: roteiroId || null,
      criadoPorId: req.usuario.id,
      status: "pendente",
    });

    const manutencaoCompleta = await Manutencao.findByPk(manutencao.id, {
      include: includePadrao,
    });

    return res.status(201).json(manutencaoCompleta);
  } catch (error) {
    console.error("Erro ao criar manutenção:", error);
    return res.status(500).json({ error: "Erro ao criar manutenção" });
  }
};

export const atualizarManutencao = async (req, res) => {
  try {
    const manutencao = await Manutencao.findByPk(req.params.id);

    if (!manutencao) {
      return res.status(404).json({ error: "Manutenção não encontrada" });
    }

    const isAdmin = req.usuario.role === "ADMIN";

    if (!isAdmin && manutencao.funcionarioId !== req.usuario.id) {
      return res
        .status(403)
        .json({ error: "Sem permissão para editar esta manutenção" });
    }

    const { descricao, funcionarioId, status } = req.body;

    const dadosAtualizacao = {};

    if (descricao !== undefined) {
      dadosAtualizacao.descricao = descricao;
    }

    if (funcionarioId !== undefined) {
      if (!isAdmin) {
        return res
          .status(403)
          .json({ error: "Apenas ADMIN pode alterar funcionário" });
      }

      if (funcionarioId) {
        const funcionario = await Usuario.findByPk(funcionarioId);
        if (!funcionario) {
          return res.status(404).json({ error: "Funcionário não encontrado" });
        }
      }

      dadosAtualizacao.funcionarioId = funcionarioId || null;
    }

    if (status !== undefined) {
      const statusNormalizado = normalizarStatus(status);
      if (!STATUS_PERMITIDOS.includes(statusNormalizado)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${STATUS_PERMITIDOS.join(", ")}`,
        });
      }

      if (!isAdmin && !["feito", "concluida"].includes(statusNormalizado)) {
        return res.status(403).json({
          error: "Funcionário só pode marcar manutenção como feito/concluida",
        });
      }

      dadosAtualizacao.status = statusNormalizado;
    }

    await manutencao.update(dadosAtualizacao);

    const manutencaoCompleta = await Manutencao.findByPk(manutencao.id, {
      include: includePadrao,
    });

    return res.json(manutencaoCompleta);
  } catch (error) {
    console.error("Erro ao atualizar manutenção:", error);
    return res.status(500).json({ error: "Erro ao atualizar manutenção" });
  }
};

export const deletarManutencao = async (req, res) => {
  try {
    const manutencao = await Manutencao.findByPk(req.params.id);

    if (!manutencao) {
      return res.status(404).json({ error: "Manutenção não encontrada" });
    }

    await manutencao.destroy();

    return res.json({ message: "Manutenção excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir manutenção:", error);
    return res.status(500).json({ error: "Erro ao excluir manutenção" });
  }
};
