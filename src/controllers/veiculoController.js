import Veiculo from "../models/Veiculo.js";
import Roteiro from "../models/Roteiro.js";
import MovimentacaoVeiculo from "../models/MovimentacaoVeiculo.js";
import { verificarRevisaoPendente } from "../services/revisaoVeiculoService.js";

const INTERVALO_REVISAO_PADRAO_KM = 10000;

const normalizarKmNaoNegativo = (valor, fallback = 0) => {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero) || numero < 0) return fallback;
  return numero;
};

const normalizarIntervaloRevisaoKm = (valor) => {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isFinite(numero) || numero <= 0) {
    return INTERVALO_REVISAO_PADRAO_KM;
  }
  return numero;
};

const calcularProximaRevisaoKm = (kmAtual, intervaloRevisaoKm) => {
  const kmSeguro = normalizarKmNaoNegativo(kmAtual, 0);
  const intervaloSeguro = normalizarIntervaloRevisaoKm(intervaloRevisaoKm);
  return (Math.floor(kmSeguro / intervaloSeguro) + 1) * intervaloSeguro;
};

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
        intervaloRevisaoKm,
      } = req.body;
      
      // Inicializar campos de revisão
      const kmInicial = normalizarKmNaoNegativo(km, 0);
      const intervaloRevisao = normalizarIntervaloRevisaoKm(intervaloRevisaoKm);
      const proximaRevisao = calcularProximaRevisaoKm(kmInicial, intervaloRevisao);
      
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
        intervaloRevisaoKm: intervaloRevisao,
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
        parada,
        modo,
        nivelCombustivel,
        nivelLimpeza,
        intervaloRevisaoKm,
      } = req.body;
      
      const veiculo = await Veiculo.findByPk(id);
      if (!veiculo)
        return res.status(404).json({ error: "Veículo não encontrado" });
      
      const kmAnterior = veiculo.km;
      const intervaloAnterior = veiculo.intervaloRevisaoKm;

      const dadosAtualizacao = {
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
      };

      if (intervaloRevisaoKm !== undefined) {
        dadosAtualizacao.intervaloRevisaoKm =
          normalizarIntervaloRevisaoKm(intervaloRevisaoKm);
      }
      
      await veiculo.update(dadosAtualizacao);

      const kmMudou = km !== undefined && km !== kmAnterior;
      const intervaloMudou =
        intervaloRevisaoKm !== undefined &&
        veiculo.intervaloRevisaoKm !== intervaloAnterior;

      // Removido: atualização automática de proximaRevisaoKm
      // proximaRevisaoKm só deve ser atualizado quando revisão for marcada como feita
      
      // Se o km foi atualizado, verificar se precisa de revisão
      if (kmMudou || intervaloMudou) {
        await verificarRevisaoPendente(id);
      }
      
      res.json(veiculo);
    } catch (err) {
      res
        .status(400)
        .json({ error: "Erro ao atualizar veículo", details: err.message });
    }
  },

  async atualizarIntervaloRevisao(req, res) {
    try {
      const { id } = req.params;
      const { intervaloRevisaoKm } = req.body;

      if (intervaloRevisaoKm === undefined || intervaloRevisaoKm === null) {
        return res
          .status(400)
          .json({ error: "intervaloRevisaoKm é obrigatório" });
      }

      const intervaloNormalizado = Number.parseInt(intervaloRevisaoKm, 10);
      if (!Number.isFinite(intervaloNormalizado) || intervaloNormalizado <= 0) {
        return res
          .status(400)
          .json({ error: "intervaloRevisaoKm deve ser um número inteiro maior que zero" });
      }

      const veiculo = await Veiculo.findByPk(id);
      if (!veiculo) {
        return res.status(404).json({ error: "Veículo não encontrado" });
      }


      await veiculo.update({
        intervaloRevisaoKm: intervaloNormalizado,
      });

      await verificarRevisaoPendente(id);

      return res.json({
        message: "Intervalo de revisão atualizado com sucesso",
        veiculo,
      });
    } catch (err) {
      return res.status(400).json({
        error: "Erro ao atualizar intervalo de revisão",
        details: err.message,
      });
    }
  },

  async remover(req, res) {
    let transaction;

    try {
      const { id } = req.params;
      transaction = await Veiculo.sequelize.transaction();

      const veiculo = await Veiculo.findByPk(id, { transaction });
      if (!veiculo)
        return res.status(404).json({ error: "Veículo não encontrado" });

      // Desvincula roteiros associados para evitar bloqueio por chave estrangeira.
      await Roteiro.update(
        { veiculoId: null },
        { where: { veiculoId: id }, transaction },
      );

      // Remove histórico de movimentações do veículo antes de excluir o cadastro.
      await MovimentacaoVeiculo.destroy({
        where: { veiculoId: id },
        transaction,
      });

      await veiculo.destroy({ transaction });
      await transaction.commit();
      res.json({ message: "Veículo removido com sucesso" });
    } catch (err) {
      if (transaction) {
        await transaction.rollback();
      }

      if (err?.name === "SequelizeForeignKeyConstraintError") {
        return res.status(409).json({
          error: "Não foi possível remover o veículo porque ele possui vínculos ativos",
          details: err.message,
        });
      }

      res
        .status(400)
        .json({ error: "Erro ao remover veículo", details: err.message });
    }
  },
};

export default veiculoController;
