import {
  Manutencao,
  Loja,
  Maquina,
  Usuario,
  Roteiro,
  Peca,
  CarrinhoPeca,
  PecaDefeituosaPendente,
} from "../models/index.js";
import { sequelize } from "../database/connection.js";

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
  { model: Usuario, as: "concluidoPor", attributes: ["id", "nome", "email"] },
  { model: Usuario, as: "verificadoPor", attributes: ["id", "nome", "email"] },
  { model: Peca, as: "pecaUsada", attributes: ["id", "nome", "categoria"] },
  { model: Roteiro, as: "roteiro", attributes: ["id", "nome"] },
];

const isStatusConcluido = (status) => ["feito", "concluida"].includes(status);
const isAdminLike = (role) => ["ADMIN", "GERENCIADOR"].includes(role);

const usuarioEhResponsavelRoteiroDaLoja = async (usuarioId, manutencao) => {
  if (!usuarioId || !manutencao?.lojaId) return false;

  if (manutencao.roteiroId) {
    const roteiro = await Roteiro.findByPk(manutencao.roteiroId, {
      include: [
        {
          model: Loja,
          as: "lojas",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
    });

    if (!roteiro || roteiro.funcionarioId !== usuarioId) {
      return false;
    }

    const lojaNoRoteiro = roteiro.lojas?.some(
      (loja) => loja.id === manutencao.lojaId,
    );
    return Boolean(lojaNoRoteiro);
  }

  const roteiroComLoja = await Roteiro.findOne({
    where: { funcionarioId: usuarioId },
    include: [
      {
        model: Loja,
        as: "lojas",
        where: { id: manutencao.lojaId },
        attributes: ["id"],
        through: { attributes: [] },
      },
    ],
  });

  return Boolean(roteiroComLoja);
};

export const listarManutencoes = async (req, res) => {
  try {
    const where = {};
    const status = normalizarStatus(req.query.status);

    if (status) {
      where.status = status;
    }

    // Filtro por lojaId
    if (req.query.lojaId) {
      where.lojaId = req.query.lojaId;
    }

    if (!isAdminLike(req.usuario.role)) {
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
    const role = req.usuario?.role;
    const isOperacional = ["FUNCIONARIO_TODAS_LOJAS", "FUNCIONARIO"].includes(
      role,
    );

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

    const funcionarioIdFinal = isOperacional
      ? req.usuario.id
      : (funcionarioId || null);

    if (!isOperacional && funcionarioIdFinal) {
      const funcionario = await Usuario.findByPk(funcionarioIdFinal);
      if (!funcionario) {
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }
    }

    if (roteiroId) {
      const roteiro = await Roteiro.findByPk(roteiroId, {
        include: [
          {
            model: Loja,
            as: "lojas",
            attributes: ["id"],
            through: { attributes: [] },
          },
        ],
      });
      if (!roteiro) {
        return res.status(404).json({ error: "Roteiro não encontrado" });
      }

      if (isOperacional && roteiro.funcionarioId !== req.usuario.id) {
        return res.status(403).json({
          error: "Você não tem permissão para usar este roteiro",
        });
      }

      const lojaNoRoteiro = roteiro.lojas?.some((loja) => loja.id === lojaId);
      if (!lojaNoRoteiro) {
        return res.status(400).json({
          error: "A loja informada não faz parte do roteiro selecionado",
        });
      }
    }

    if (isOperacional) {
      const totalRoteirosDoUsuario = await Roteiro.count({
        where: { funcionarioId: req.usuario.id },
      });

      if (totalRoteirosDoUsuario > 0 && !roteiroId) {
        const roteiroComLoja = await Roteiro.findOne({
          where: { funcionarioId: req.usuario.id },
          include: [
            {
              model: Loja,
              as: "lojas",
              where: { id: lojaId },
              attributes: ["id"],
              through: { attributes: [] },
            },
          ],
        });

        if (!roteiroComLoja) {
          return res.status(403).json({
            error:
              "A loja informada não faz parte do roteiro do usuário autenticado",
          });
        }
      }
    }

    const manutencao = await Manutencao.create({
      descricao,
      lojaId,
      maquinaId,
      funcionarioId: funcionarioIdFinal,
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

    const isAdmin = isAdminLike(req.usuario.role);

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
          .json({ error: "Apenas ADMIN ou GERENCIADOR pode alterar funcionário" });
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

      if (!isAdmin && !isStatusConcluido(statusNormalizado)) {
        return res.status(403).json({
          error: "Funcionário só pode marcar manutenção como feito/concluida",
        });
      }

      if (!isAdmin && isStatusConcluido(statusNormalizado)) {
        const autorizadoNoRoteiro = await usuarioEhResponsavelRoteiroDaLoja(
          req.usuario.id,
          manutencao,
        );

        if (!autorizadoNoRoteiro) {
          return res.status(403).json({
            error:
              "Somente o funcionário responsável pelo roteiro desta loja pode concluir a manutenção",
          });
        }
      }

      dadosAtualizacao.status = statusNormalizado;

      if (isStatusConcluido(statusNormalizado)) {
        dadosAtualizacao.concluidoPorId = req.usuario.id;
        dadosAtualizacao.concluidoEm = new Date();
      } else {
        dadosAtualizacao.concluidoPorId = null;
        dadosAtualizacao.concluidoEm = null;
      }
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

/**
 * Concluir manutenção (marcar como "feito")
 * Permite com ou sem uso de peça
 */
export const concluirManutencao = async (req, res) => {
  let transaction;

  try {
    const { id } = req.params;
    const { status, concluidoPorId, pecaId, quantidade, explicacao_sem_peca } =
      req.body;

    if (!concluidoPorId) {
      return res.status(400).json({ error: "concluidoPorId é obrigatório" });
    }

    const statusNormalizado = status ? normalizarStatus(status) : "feito";
    if (!["feito", "concluida"].includes(statusNormalizado)) {
      return res.status(400).json({
        error: "Status inválido para conclusão. Use 'feito' ou 'concluida'",
      });
    }

    const usandoPeca =
      pecaId !== undefined && pecaId !== null && String(pecaId).trim() !== "";

    let quantidadeUsada = null;

    if (usandoPeca) {
      const quantidadeNumero = Number(quantidade);
      if (!Number.isInteger(quantidadeNumero) || quantidadeNumero <= 0) {
        return res.status(400).json({
          error: "quantidade deve ser um inteiro positivo quando pecaId for informado",
        });
      }

      quantidadeUsada = quantidadeNumero;
    } else {
      if (!explicacao_sem_peca || explicacao_sem_peca.trim() === "") {
        return res.status(400).json({
          error: "Observação é obrigatória ao concluir manutenção sem peça",
        });
      }
    }

    if (explicacao_sem_peca && explicacao_sem_peca.length > 100) {
      return res.status(400).json({
        error: "Observação deve ter no máximo 100 caracteres",
      });
    }

    transaction = await sequelize.transaction();

    const manutencao = await Manutencao.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!manutencao) {
      await transaction.rollback();
      return res.status(404).json({ error: "Manutenção não encontrada" });
    }

    if (isStatusConcluido(normalizarStatus(manutencao.status))) {
      await transaction.rollback();
      return res.status(409).json({
        error: "Conflito de estado: manutenção já foi concluída",
      });
    }

    let pecaUsadaId = null;
    let quantidadePecaUsada = null;
    let carrinhoResumo = null;

    if (usandoPeca) {
      const itemCarrinho = await CarrinhoPeca.findOne({
        where: {
          usuarioId: concluidoPorId,
          pecaId: pecaId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!itemCarrinho) {
        await transaction.rollback();
        return res.status(404).json({
          error: "Peça não encontrada no carrinho do funcionário",
        });
      }

      const quantidadeAnterior = Number(itemCarrinho.quantidade) || 0;
      if (quantidadeUsada > quantidadeAnterior) {
        await transaction.rollback();
        return res.status(400).json({
          error: "Quantidade solicitada maior que a disponível no carrinho",
          quantidadeDisponivel: quantidadeAnterior,
          quantidadeSolicitada: quantidadeUsada,
        });
      }

      const peca = await Peca.findByPk(pecaId, { transaction });
      if (!peca) {
        await transaction.rollback();
        return res.status(404).json({ error: "Peça não encontrada" });
      }

      const quantidadeRestante = quantidadeAnterior - quantidadeUsada;

      if (quantidadeRestante > 0) {
        itemCarrinho.quantidade = quantidadeRestante;
        await itemCarrinho.save({ transaction });
      } else {
        await itemCarrinho.destroy({ transaction });
      }

      await PecaDefeituosaPendente.create({
        usuarioId: concluidoPorId,
        manutencaoId: manutencao.id,
        pecaOriginalId: peca.id,
        nomePecaOriginal: peca.nome,
        nomePecaDefeituosa: `${peca.nome} defeituosa`,
        quantidade: quantidadeUsada,
      }, {
        transaction,
      });

      pecaUsadaId = pecaId;
      quantidadePecaUsada = quantidadeUsada;

      carrinhoResumo = {
        pecaId,
        quantidadeAnterior,
        quantidadeUsada,
        quantidadeRestante,
      };
    }

    await manutencao.update({
      status: statusNormalizado,
      concluidoPorId: concluidoPorId,
      concluidoEm: new Date(),
      pecaUsadaId: pecaUsadaId,
      quantidadePecaUsada,
      explicacao_sem_peca: usandoPeca ? null : explicacao_sem_peca.trim(),
    }, {
      transaction,
    });

    const manutencaoCompleta = await Manutencao.findByPk(id, {
      include: includePadrao,
      transaction,
    });

    await transaction.commit();
    transaction = null;

    console.log(
      `[Manutenção] Manutenção ${id} concluída por usuário ${concluidoPorId}`,
    );

    return res.json({
      message: "Manutenção concluída com sucesso",
      manutencao: {
        ...manutencaoCompleta.toJSON(),
        quantidadePecaUsada,
      },
      carrinho: carrinhoResumo,
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }

    console.error("Erro ao concluir manutenção:", error);
    return res.status(500).json({ error: "Erro ao concluir manutenção" });
  }
};

/**
 * Registrar que manutenção não foi feita (permanece pendente)
 * Requer explicação obrigatória
 */
export const naoFazerManutencao = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificadoPorId, explicacao_nao_fazer } = req.body;

    // Buscar manutenção
    const manutencao = await Manutencao.findByPk(id);
    if (!manutencao) {
      return res.status(404).json({ error: "Manutenção não encontrada" });
    }

    // Validações
    if (!verificadoPorId) {
      return res.status(400).json({ error: "verificadoPorId é obrigatório" });
    }

    if (!explicacao_nao_fazer) {
      return res.status(400).json({
        error: "Explicação obrigatória para não fazer manutenção"
      });
    }

    // Validar tamanho da explicação
    if (explicacao_nao_fazer.length > 100) {
      return res.status(400).json({
        error: "Explicação deve ter no máximo 100 caracteres"
      });
    }

    // Atualizar manutenção (status permanece pendente)
    await manutencao.update({
      verificadoPorId: verificadoPorId,
      verificadoEm: new Date(),
      explicacao_nao_fazer: explicacao_nao_fazer
    });

    // Buscar manutenção atualizada com includes
    const manutencaoCompleta = await Manutencao.findByPk(id, {
      include: includePadrao
    });

    console.log(`[Manutenção] Manutenção ${id} não foi feita. Verificada por usuário ${verificadoPorId}`);

    return res.json({
      message: "Explicação registrada com sucesso",
      manutencao: manutencaoCompleta
    });

  } catch (error) {
    console.error("Erro ao registrar não fazer manutenção:", error);
    return res.status(500).json({ error: "Erro ao registrar explicação" });
  }
};
