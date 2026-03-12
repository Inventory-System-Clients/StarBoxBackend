import { Op } from "sequelize";
import {
  Loja,
  Maquina,
  Manutencao,
  Usuario,
  Roteiro,
} from "../models/index.js";
import ManutencaoWhatsAppPrompt from "../models/ManutencaoWhatsAppPrompt.js";
import { normalizePhoneNumber } from "../services/whatsappService.js";

const ORIGEM_RESPONSAVEL = {
  FUNCIONARIO_INFORMADO: "funcionario_informado",
  FUNCIONARIO_MANUTENCAO: "funcionario_manutencao",
  ROTEIRO_DA_LOJA: "roteiro_da_loja",
  LOJA_HABILITADA: "loja_habilitada",
  NAO_ENCONTRADO: "nao_encontrado",
};

const criarLinkWhatsApp = (telefone, mensagem) => {
  const texto = encodeURIComponent(String(mensagem || ""));
  if (telefone) {
    return `https://wa.me/${telefone}?text=${texto}`;
  }
  return `https://wa.me/?text=${texto}`;
};

const montarMensagemManutencao = ({
  loja,
  maquina,
  descricao,
  manutencaoId,
  roteiro,
  funcionario,
}) => {
  const linhas = [];

  if (funcionario?.nome) {
    linhas.push(`Ola ${funcionario.nome},`);
  } else {
    linhas.push("Ola,");
  }

  linhas.push("");
  linhas.push("foi cadastrada uma manutencao para voce.");
  linhas.push(`Loja: ${loja.nome}`);
  linhas.push(`Maquina: ${maquina.nome}`);

  if (descricao) {
    linhas.push(`Descricao: ${descricao}`);
  }

  if (manutencaoId) {
    linhas.push(`ID manutencao: ${manutencaoId}`);
  }

  if (roteiro?.nome) {
    linhas.push(`Roteiro: ${roteiro.nome}`);
  }

  linhas.push("");
  linhas.push("Favor realizar o conserto dessa loja.");

  return linhas.join("\n");
};

const buscarFuncionarioPorId = async (funcionarioId) => {
  if (!funcionarioId) return null;

  const funcionario = await Usuario.findByPk(funcionarioId, {
    attributes: ["id", "nome", "telefone", "role", "ativo"],
  });

  if (!funcionario || !funcionario.ativo) {
    return null;
  }

  return funcionario;
};

const buscarResponsavelPorRoteiroDaLoja = async (lojaId) => {
  const roteiro = await Roteiro.findOne({
    where: {
      funcionarioId: {
        [Op.ne]: null,
      },
    },
    include: [
      {
        model: Loja,
        as: "lojas",
        where: { id: lojaId },
        attributes: ["id", "nome"],
        through: { attributes: [] },
      },
    ],
    order: [["updatedAt", "DESC"]],
  });

  if (!roteiro?.funcionarioId) {
    return { funcionario: null, roteiro: null };
  }

  const funcionario = await buscarFuncionarioPorId(roteiro.funcionarioId);
  return { funcionario, roteiro };
};

const buscarFuncionarioComLojaHabilitada = async (lojaId) => {
  const funcionario = await Usuario.findOne({
    where: {
      ativo: true,
      role: {
        [Op.in]: ["FUNCIONARIO", "FUNCIONARIO_TODAS_LOJAS"],
      },
    },
    include: [
      {
        model: Loja,
        as: "lojasPermitidas",
        where: { id: lojaId },
        attributes: ["id", "nome"],
        through: { attributes: [] },
      },
    ],
    order: [["updatedAt", "DESC"]],
  });

  return funcionario || null;
};

const escolherMelhorCandidato = (candidatos) => {
  if (!candidatos.length) return null;

  const comTelefone = candidatos.find((item) =>
    Boolean(normalizePhoneNumber(item.funcionario?.telefone)),
  );

  return comTelefone || candidatos[0];
};

const mapearFuncionarioResposta = (funcionario, origem = null) => ({
  id: funcionario.id,
  nome: funcionario.nome,
  telefone: normalizePhoneNumber(funcionario.telefone),
  origem,
});

export const listarDestinatariosWhatsAppManutencao = async (req, res) => {
  try {
    const { lojaId } = req.query;

    if (!lojaId) {
      return res.status(400).json({
        error: "Parametro obrigatorio: lojaId",
      });
    }

    const loja = await Loja.findByPk(lojaId, {
      attributes: ["id", "nome"],
    });

    if (!loja) {
      return res.status(404).json({ error: "Loja nao encontrada" });
    }

    const [funcionarios, roteiroInfo] = await Promise.all([
      Usuario.findAll({
        where: {
          ativo: true,
          role: {
            [Op.in]: ["FUNCIONARIO", "FUNCIONARIO_TODAS_LOJAS"],
          },
        },
        attributes: ["id", "nome", "telefone"],
        order: [["nome", "ASC"]],
      }),
      buscarResponsavelPorRoteiroDaLoja(lojaId),
    ]);

    const defaultFuncionarioId = roteiroInfo?.funcionario?.id || null;
    const origemPadrao = roteiroInfo?.funcionario
      ? ORIGEM_RESPONSAVEL.ROTEIRO_DA_LOJA
      : null;

    return res.json({
      loja: { id: loja.id, nome: loja.nome },
      defaultFuncionarioId,
      origemPadrao,
      funcionarios: funcionarios.map((funcionario) =>
        mapearFuncionarioResposta(
          funcionario,
          String(funcionario.id) === String(defaultFuncionarioId)
            ? ORIGEM_RESPONSAVEL.ROTEIRO_DA_LOJA
            : null,
        ),
      ),
    });
  } catch (error) {
    console.error(
      "Erro ao listar destinatarios de WhatsApp da manutencao:",
      error,
    );
    return res.status(500).json({
      error: "Erro ao listar destinatarios de WhatsApp da manutencao",
    });
  }
};

export const gerarPromptWhatsAppManutencao = async (req, res) => {
  try {
    const { lojaId, maquinaId, manutencaoId, descricao, funcionarioId } =
      req.body;

    if (!lojaId || !maquinaId) {
      return res.status(400).json({
        error: "Campos obrigatorios: lojaId e maquinaId",
      });
    }

    const [loja, maquina] = await Promise.all([
      Loja.findByPk(lojaId, { attributes: ["id", "nome"] }),
      Maquina.findByPk(maquinaId, { attributes: ["id", "nome", "lojaId"] }),
    ]);

    if (!loja) {
      return res.status(404).json({ error: "Loja nao encontrada" });
    }

    if (!maquina) {
      return res.status(404).json({ error: "Maquina nao encontrada" });
    }

    if (String(maquina.lojaId) !== String(lojaId)) {
      return res.status(400).json({
        error: "A maquina selecionada nao pertence a loja informada",
      });
    }

    let manutencao = null;
    if (manutencaoId) {
      manutencao = await Manutencao.findByPk(manutencaoId, {
        attributes: ["id", "descricao", "funcionarioId", "lojaId", "maquinaId"],
      });

      if (!manutencao) {
        return res.status(404).json({ error: "Manutencao nao encontrada" });
      }

      if (String(manutencao.lojaId) !== String(lojaId)) {
        return res.status(400).json({
          error: "A manutencao informada nao pertence a loja selecionada",
        });
      }

      if (String(manutencao.maquinaId) !== String(maquinaId)) {
        return res.status(400).json({
          error: "A manutencao informada nao pertence a maquina selecionada",
        });
      }
    }

    const candidatos = [];
    const idsAdicionados = new Set();

    const adicionarCandidato = ({ funcionario, origem, roteiro = null }) => {
      if (!funcionario?.id) return;
      const chave = String(funcionario.id);
      if (idsAdicionados.has(chave)) return;
      idsAdicionados.add(chave);
      candidatos.push({ funcionario, origem, roteiro });
    };

    const funcionarioInformado = await buscarFuncionarioPorId(funcionarioId);
    if (funcionarioId && !funcionarioInformado) {
      return res.status(404).json({
        error: "Funcionario selecionado nao encontrado ou inativo",
      });
    }

    if (funcionarioInformado) {
      adicionarCandidato({
        funcionario: funcionarioInformado,
        origem: ORIGEM_RESPONSAVEL.FUNCIONARIO_INFORMADO,
      });
    }

    const funcionarioDaManutencao = await buscarFuncionarioPorId(
      manutencao?.funcionarioId,
    );
    adicionarCandidato({
      funcionario: funcionarioDaManutencao,
      origem: ORIGEM_RESPONSAVEL.FUNCIONARIO_MANUTENCAO,
    });

    const { funcionario: funcionarioRoteiro, roteiro } =
      await buscarResponsavelPorRoteiroDaLoja(lojaId);
    adicionarCandidato({
      funcionario: funcionarioRoteiro,
      origem: ORIGEM_RESPONSAVEL.ROTEIRO_DA_LOJA,
      roteiro,
    });

    const funcionarioLojaHabilitada =
      await buscarFuncionarioComLojaHabilitada(lojaId);
    adicionarCandidato({
      funcionario: funcionarioLojaHabilitada,
      origem: ORIGEM_RESPONSAVEL.LOJA_HABILITADA,
    });

    const candidatoEscolhido = funcionarioInformado
      ? {
          funcionario: funcionarioInformado,
          origem: ORIGEM_RESPONSAVEL.FUNCIONARIO_INFORMADO,
          roteiro: null,
        }
      : escolherMelhorCandidato(candidatos);
    const funcionario = candidatoEscolhido?.funcionario || null;
    const origemResponsavel =
      candidatoEscolhido?.origem || ORIGEM_RESPONSAVEL.NAO_ENCONTRADO;
    const roteiroSelecionado = candidatoEscolhido?.roteiro || null;

    const telefoneNormalizado = normalizePhoneNumber(funcionario?.telefone);
    const descricaoFinal =
      String(descricao || "").trim() ||
      manutencao?.descricao ||
      "Sem descricao";

    const mensagem = montarMensagemManutencao({
      loja,
      maquina,
      descricao: descricaoFinal,
      manutencaoId: manutencao?.id || null,
      roteiro: roteiroSelecionado,
      funcionario,
    });

    const whatsappUrl = criarLinkWhatsApp(telefoneNormalizado, mensagem);

    const prompt = await ManutencaoWhatsAppPrompt.create({
      manutencaoId: manutencao?.id || null,
      lojaId,
      maquinaId,
      roteiroId: roteiroSelecionado?.id || null,
      funcionarioId: funcionario?.id || null,
      criadoPorId: req.usuario?.id || null,
      destinatarioTelefone: telefoneNormalizado,
      mensagem,
      whatsappUrl,
      origemResponsavel,
      metadata: {
        funcionarioNome: funcionario?.nome || null,
        rota: "/manutencao-whatsapp-prompts/gerar",
      },
    });

    return res.status(201).json({
      id: prompt.id,
      whatsappUrl,
      mensagem,
      origemResponsavel,
      responsavel: funcionario
        ? {
            id: funcionario.id,
            nome: funcionario.nome,
            telefone: telefoneNormalizado,
          }
        : null,
      roteiro: roteiroSelecionado
        ? {
            id: roteiroSelecionado.id,
            nome: roteiroSelecionado.nome,
          }
        : null,
      aviso: telefoneNormalizado
        ? null
        : "Nenhum telefone valido foi encontrado para o responsavel.",
    });
  } catch (error) {
    console.error("Erro ao gerar prompt de WhatsApp da manutencao:", error);
    return res
      .status(500)
      .json({ error: "Erro ao gerar prompt de WhatsApp da manutencao" });
  }
};

export const listarPromptsWhatsAppManutencao = async (req, res) => {
  try {
    const limite = Number(req.query.limite || 50);
    const prompts = await ManutencaoWhatsAppPrompt.findAll({
      order: [["createdAt", "DESC"]],
      limit: Number.isNaN(limite) ? 50 : limite,
    });

    return res.json(prompts);
  } catch (error) {
    console.error("Erro ao listar prompts de WhatsApp da manutencao:", error);
    return res.status(500).json({
      error: "Erro ao listar prompts de WhatsApp da manutencao",
    });
  }
};
