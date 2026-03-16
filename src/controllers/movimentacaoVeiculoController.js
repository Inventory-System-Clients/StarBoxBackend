import MovimentacaoVeiculo from "../models/MovimentacaoVeiculo.js";
import Veiculo from "../models/Veiculo.js";
import Usuario from "../models/Usuario.js";
import { Op, Sequelize } from "sequelize";
import { verificarRevisaoPendente } from "../services/revisaoVeiculoService.js";
// Buscar a última movimentação de cada veículo
export const ultimasMovimentacoesPorVeiculo = async (req, res) => {
  try {
    // Busca todas as últimas movimentações para cada veículo
    const ultimas = await MovimentacaoVeiculo.findAll({
      attributes: [
        [Sequelize.col("veiculoid"), "veiculoId"],
        [Sequelize.fn("MAX", Sequelize.col("datahora")), "ultimaDataHora"],
      ],
      group: ["veiculoid"],
      raw: true,
    });

    // Buscar os detalhes completos das últimas movimentações
    const ultimasDetalhes = await Promise.all(
      ultimas.map(async (u) => {
        const mov = await MovimentacaoVeiculo.findOne({
          where: {
            veiculoId: u.veiculoId,
            dataHora: u.ultimaDataHora,
          },
          include: [
            {
              model: Veiculo,
              as: "veiculo",
              attributes: ["id", "nome", "modelo"],
            },
            {
              model: Usuario,
              as: "usuario",
              attributes: ["id", "nome", "email"],
            },
          ],
        });
        return mov ? mov.toJSON() : null;
      }),
    );
    // Retorna um objeto { [veiculoId]: movimentacao }
    const resultado = {};
    ultimasDetalhes.forEach((mov) => {
      if (mov && mov.veiculoId) resultado[mov.veiculoId] = mov;
    });
    res.json(resultado);
  } catch (error) {
    console.error("Erro ao buscar últimas movimentações por veículo:", error);
    res
      .status(500)
      .json({ error: "Erro ao buscar últimas movimentações por veículo" });
  }
};

// Registrar movimentação (retirada, devolução ou abastecimento)
export const registrarMovimentacaoVeiculo = async (req, res) => {
  try {
    const {
      veiculoId,
      tipo,
      gasolina,
      nivel_limpeza,
      estado,
      modo,
      obs,
      km,
      litros,
      roteiroId,
    } = req.body;
    const usuarioId = req.usuario?.id;
    if (!veiculoId || !tipo || !usuarioId) {
      return res.status(400).json({ error: "Dados obrigatórios ausentes." });
    }

    const veiculo = await Veiculo.findByPk(veiculoId);
    if (!veiculo) {
      return res.status(404).json({ error: "Veículo não encontrado" });
    }

    let kmNumerico = null;
    if (km !== null && km !== undefined && String(km).trim() !== "") {
      const kmConvertido = Number.parseInt(km, 10);
      if (!Number.isInteger(kmConvertido) || kmConvertido < 0) {
        return res.status(400).json({
          error: "KM deve ser um número inteiro maior ou igual a zero.",
        });
      }
      kmNumerico = kmConvertido;
    }

    if (kmNumerico !== null) {
      const ultimaMovimentacaoComKm = await MovimentacaoVeiculo.findOne({
        where: {
          veiculoId,
          km: {
            [Op.ne]: null,
          },
        },
        order: [["dataHora", "DESC"]],
      });

      const kmAtualVeiculo = Number.parseInt(veiculo.km, 10);
      const kmUltimaMovimentacao = Number.parseInt(
        ultimaMovimentacaoComKm?.km,
        10,
      );

      const kmReferencia = Math.max(
        Number.isInteger(kmAtualVeiculo) ? kmAtualVeiculo : 0,
        Number.isInteger(kmUltimaMovimentacao) ? kmUltimaMovimentacao : 0,
      );

      if (kmNumerico < kmReferencia) {
        return res.status(400).json({
          error: `O KM informado (${kmNumerico}) não pode ser menor que o KM anterior (${kmReferencia}).`,
          kmReferencia,
        });
      }
    }

    const movimentacao = await MovimentacaoVeiculo.create({
      veiculoId,
      usuarioId,
      tipo,
      dataHora: new Date(),
      gasolina,
      nivel_limpeza,
      estado,
      modo,
      obs,
      km: kmNumerico,
      litros: litros != null ? Number(litros) : null,
      roteiroId: roteiroId ?? null,
    });

    // Se informou km, verificar se precisa de revisão
    if (kmNumerico !== null) {
      await verificarRevisaoPendente(veiculoId);
    }

    // Se abastecimento: atualizar km e nivelCombustivel do veículo
    if (tipo === "abastecimento") {
      const atualizacoes = {};
      if (kmNumerico !== null && kmNumerico > Number(veiculo.km || 0)) {
        atualizacoes.km = kmNumerico;
      }
      if (gasolina) {
        atualizacoes.nivelCombustivel = gasolina;
      }
      if (Object.keys(atualizacoes).length > 0) {
        await Veiculo.update(atualizacoes, { where: { id: veiculoId } });
      }
    }

    res.status(201).json(movimentacao);
  } catch (error) {
    console.error("Erro ao registrar movimentação de veículo:", error);
    res
      .status(500)
      .json({ error: "Erro ao registrar movimentação de veículo" });
  }
};

// Listar movimentações com filtro por veiculo e data
export const listarMovimentacoesVeiculo = async (req, res) => {
  try {
    const { veiculoId, dataInicio, dataFim } = req.query;
    const where = {};
    if (veiculoId) where.veiculoId = veiculoId;
    let inicio, fim;
    if (dataInicio && dataFim) {
      inicio = new Date(dataInicio + "T00:00:00.000Z");
      fim = new Date(dataFim + "T23:59:59.999Z");
      where.dataHora = { [Op.gte]: inicio, [Op.lte]: fim };
      console.log("[Filtro] Período:", { dataInicio, dataFim, inicio, fim });
    } else if (dataInicio && !dataFim) {
      inicio = new Date(dataInicio + "T00:00:00.000Z");
      fim = new Date(dataInicio + "T23:59:59.999Z");
      where.dataHora = { [Op.gte]: inicio, [Op.lte]: fim };
      console.log("[Filtro] Só início:", { dataInicio, inicio, fim });
    } else if (!dataInicio && dataFim) {
      fim = new Date(dataFim + "T23:59:59.999Z");
      where.dataHora = { [Op.lte]: fim };
      console.log("[Filtro] Só fim:", { dataFim, fim });
    }
    console.log("[Filtro] where:", JSON.stringify(where));
    const movimentacoes = await MovimentacaoVeiculo.findAll({
      where,
      include: [
        {
          model: Veiculo,
          as: "veiculo",
          attributes: ["id", "nome", "modelo", "km"],
        },
        { model: Usuario, as: "usuario", attributes: ["id", "nome", "email"] },
      ],
      order: [["dataHora", "DESC"]],
    });
    res.json(movimentacoes);
  } catch (error) {
    console.error("Erro ao listar movimentações de veículo:", error);
    res.status(500).json({ error: "Erro ao listar movimentações de veículo" });
  }
};

// Listar apenas abastecimentos com cálculo de km/l
export const listarAbastecimentos = async (req, res) => {
  try {
    const { veiculoId, dataInicio, dataFim } = req.query;
    const where = { tipo: "abastecimento" };
    if (veiculoId) where.veiculoId = veiculoId;
    if (dataInicio && dataFim) {
      where.dataHora = {
        [Op.gte]: new Date(dataInicio + "T00:00:00.000Z"),
        [Op.lte]: new Date(dataFim + "T23:59:59.999Z"),
      };
    }
    const abastecimentos = await MovimentacaoVeiculo.findAll({
      where,
      include: [
        {
          model: Veiculo,
          as: "veiculo",
          attributes: ["id", "nome", "modelo", "tipo"],
        },
        { model: Usuario, as: "usuario", attributes: ["id", "nome"] },
      ],
      order: [
        ["veiculoId", "ASC"],
        ["dataHora", "ASC"],
      ],
    });
    res.json(abastecimentos);
  } catch (error) {
    console.error("Erro ao listar abastecimentos:", error);
    res.status(500).json({ error: "Erro ao listar abastecimentos" });
  }
};
