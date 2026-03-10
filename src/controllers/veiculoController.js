import Veiculo from "../models/Veiculo.js";
import { verificarRevisaoPendente } from "../services/revisaoVeiculoService.js";

const veiculoController = {
  async listar(req, res) {
    try {
      console.log("[LOG] GET /veiculos chamado");
      const veiculos = await Veiculo.findAll();
      console.log("[LOG] Veículos retornados:", veiculos);
      res.json(veiculos);
    } catch (err) {
      console.error("[ERRO] Erro ao buscar veículos:", err);
      res
        .status(500)
        .json({ error: "Erro ao buscar veículos", details: err.message });
    }
  },

  async criar(req, res) {
    try {
      const {
        tipo,
        nome,
        modelo,
        km,
        estado,
        emoji,
        emUso,
        parada,
        modo,
        nivelCombustivel,
        nivelLimpeza,
      } = req.body;
      
      // Inicializar campos de revisão
      const kmInicial = km || 0;
      const proximaRevisao = Math.ceil(kmInicial / 10000) * 10000 + 10000;
      
      const veiculo = await Veiculo.create({
        tipo,
        nome,
        modelo,
        km: kmInicial,
        estado,
        emoji,
        emUso,
        parada,
        modo,
        nivelCombustivel,
        nivelLimpeza,
        kmInicialCadastro: kmInicial,
        proximaRevisaoKm: proximaRevisao,
      });
      
      res.status(201).json(veiculo);
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erro ao criar veículo", details: err.message });
    }
  },

  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        tipo,
        nome,
        modelo,
        km,
        estado,
        emoji,
        emUso,
      
      const kmAnterior = veiculo.km;
      
      await veiculo.update({
        tipo,
        nome,
        modelo,
        km,
        estado,
        emoji,
        emUso,
        parada,
        modo,
        nivelCombustivel,
        nivelLimpeza,
      });
      
      // Se o km foi atualizado, verificar se precisa de revisão
      if (km !== undefined && km !== kmAnterior) {
        await verificarRevisaoPendente(id);
      }
      m,
        estado,
        emoji,
        emUso,
        parada,
        modo,
        nivelCombustivel,
        nivelLimpeza,
      });
      res.json(veiculo);
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erro ao atualizar veículo", details: err.message });
    }
  },

  async remover(req, res) {
    try {
      const { id } = req.params;
      const veiculo = await Veiculo.findByPk(id);
      if (!veiculo)
        return res.status(404).json({ error: "Veículo não encontrado" });
      await veiculo.destroy();
      res.json({ message: "Veículo removido com sucesso" });
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erro ao remover veículo", details: err.message });
    }
  },
};

export default veiculoController;
