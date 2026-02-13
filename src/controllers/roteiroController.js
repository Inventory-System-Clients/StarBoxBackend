import { Roteiro, Loja, Usuario } from "../models/index.js";

export const criarRoteiro = async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome é obrigatório" });
    const roteiro = await Roteiro.create({ nome });
    res.status(201).json(roteiro);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar roteiro" });
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
