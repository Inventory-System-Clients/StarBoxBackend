import { sequelize } from "../database/connection.js";
import { GastoFixoLoja, Loja } from "../models/index.js";

const parseValorMonetario = (valor) => {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : NaN;
  }

  const texto = String(valor ?? "").trim();
  if (!texto) return 0;

  const limpo = texto.replace(/[^\d.,-]/g, "");
  const normalizado =
    limpo.includes(",") && limpo.includes(".")
      ? limpo.replace(/\./g, "").replace(",", ".")
      : limpo.replace(",", ".");

  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : NaN;
};

export const listarGastosFixosPorLoja = async (req, res) => {
  try {
    const { id } = req.params;

    const gastos = await GastoFixoLoja.findAll({
      where: { lojaId: id },
      attributes: ["id", "lojaId", "nome", "valor", "createdAt", "updatedAt"],
      order: [["createdAt", "ASC"]],
      raw: true,
    });

    return res.json(gastos);
  } catch (error) {
    console.error("Erro ao listar gastos fixos da loja:", error);
    return res
      .status(500)
      .json({ error: "Erro ao listar gastos fixos da loja" });
  }
};

export const salvarGastosFixosPorLoja = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { gastos } = req.body;

    const loja = await Loja.findByPk(id, { transaction });
    if (!loja) {
      await transaction.rollback();
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    if (!Array.isArray(gastos)) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ error: "O campo 'gastos' deve ser um array" });
    }

    const gastosSanitizados = gastos
      .map((item) => {
        const nome = String(item?.nome ?? "").trim();
        const valor = parseValorMonetario(item?.valor);
        return { nome, valor };
      })
      .filter((item) => item.nome.length > 0);

    const possuiValorInvalido = gastosSanitizados.some(
      (item) => !Number.isFinite(item.valor) || item.valor < 0,
    );
    if (possuiValorInvalido) {
      await transaction.rollback();
      return res
        .status(400)
        .json({
          error: "Todos os gastos fixos devem ter valor numérico válido",
        });
    }

    await GastoFixoLoja.destroy({ where: { lojaId: id }, transaction });

    if (gastosSanitizados.length > 0) {
      await GastoFixoLoja.bulkCreate(
        gastosSanitizados.map((item) => ({
          lojaId: id,
          nome: item.nome,
          valor: Number(item.valor.toFixed(2)),
        })),
        { transaction },
      );
    }

    await transaction.commit();

    const gastosAtualizados = await GastoFixoLoja.findAll({
      where: { lojaId: id },
      attributes: ["id", "lojaId", "nome", "valor", "createdAt", "updatedAt"],
      order: [["createdAt", "ASC"]],
      raw: true,
    });

    return res.json({
      lojaId: id,
      total: gastosAtualizados.length,
      gastos: gastosAtualizados,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Erro ao salvar gastos fixos da loja:", error);
    return res
      .status(500)
      .json({ error: "Erro ao salvar gastos fixos da loja" });
  }
};