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
  try {
    const { id } = req.params;
    const { concluidoPorId, pecaId, explicacao_sem_peca } = req.body;

    // Buscar manutenção
    const manutencao = await Manutencao.findByPk(id);
    if (!manutencao) {
      return res.status(404).json({ error: "Manutenção não encontrada" });
    }

    // Validações
    if (!concluidoPorId) {
      return res.status(400).json({ error: "concluidoPorId é obrigatório" });
    }

    // Observação é obrigatória sempre
    if (!explicacao_sem_peca || explicacao_sem_peca.trim() === '') {
      return res.status(400).json({
        error: "Observação é obrigatória ao concluir manutenção"
      });
    }

    // Validar tamanho da explicação
    if (explicacao_sem_peca.length > 100) {
      return res.status(400).json({
        error: "Observação deve ter no máximo 100 caracteres"
      });
    }

    let pecaUsadaId = null;

    // Se informou pecaId, verificar se está no carrinho e remover
    if (pecaId) {
      const itemCarrinho = await CarrinhoPeca.findOne({
        where: {
          usuarioId: concluidoPorId,
          pecaId: pecaId
        }
      });

      if (!itemCarrinho) {
        return res.status(404).json({
          error: "Peça não encontrada no carrinho do funcionário"
        });
      }

      // Verificar se a peça existe
      const peca = await Peca.findByPk(pecaId);
      if (!peca) {
        return res.status(404).json({ error: "Peça não encontrada" });
      }

      const quantidadeDefeituosa = Math.max(
        1,
        Number.parseInt(itemCarrinho.quantidade, 10) || 1,
      );

      await PecaDefeituosaPendente.create({
        usuarioId: concluidoPorId,
        manutencaoId: manutencao.id,
        pecaOriginalId: peca.id,
        nomePecaOriginal: peca.nome,
        nomePecaDefeituosa: `${peca.nome} defeituosa`,
        quantidade: quantidadeDefeituosa,
      });

      // Remover do carrinho (usa função do carrinhoPecaController)
      await itemCarrinho.destroy();
      
      console.log(`[Manutenção] Peça ${pecaId} removida do carrinho do usuário ${concluidoPorId}`);
      
      pecaUsadaId = pecaId;
    }

    // Atualizar manutenção
    await manutencao.update({
      status: "feito",
      concluidoPorId: concluidoPorId,
      concluidoEm: new Date(),
      pecaUsadaId: pecaUsadaId,
      explicacao_sem_peca: explicacao_sem_peca || null
    });

    // Buscar manutenção atualizada com includes
    const manutencaoCompleta = await Manutencao.findByPk(id, {
      include: includePadrao
    });

    console.log(`[Manutenção] Manutenção ${id} concluída por usuário ${concluidoPorId}`);

    return res.json({
      message: "Manutenção concluída com sucesso",
      manutencao: manutencaoCompleta
    });

  } catch (error) {
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
