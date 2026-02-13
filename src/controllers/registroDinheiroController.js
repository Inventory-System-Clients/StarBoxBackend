import RegistroDinheiro from "../models/RegistroDinheiro.js";

const registroDinheiroController = {
  async criar(req, res) {
    try {
      const {
        loja,
        maquina,
        registrarTotalLoja,
        inicio,
        fim,
        valorDinheiro,
        valorCartaoPix,
        observacoes,
      } = req.body;

      // Log dos dados recebidos
      console.log("[RegistrarDinheiro] Dados recebidos:", req.body);

      // Validação de campos obrigatórios
      if (!loja || !inicio || !fim) {
        console.error("[RegistrarDinheiro] Campos obrigatórios ausentes");
        return res
          .status(400)
          .json({ error: "Campos obrigatórios ausentes: loja, início e fim." });
      }
      // Se registrarTotalLoja, não registrar máquina
      try {
        const registro = await RegistroDinheiro.create({
          lojaId: loja,
          maquinaId: registrarTotalLoja ? null : maquina || null,
          registrarTotalLoja: !!registrarTotalLoja,
          inicio,
          fim,
          valorDinheiro: valorDinheiro || 0,
          valorCartaoPix: valorCartaoPix || 0,
          observacoes,
        });
        return res.status(201).json(registro);
      } catch (dbErr) {
        console.error("[RegistrarDinheiro] Erro ao salvar no banco:", dbErr);
        return res
          .status(500)
          .json({
            error: "Erro ao registrar dinheiro",
            details: dbErr.message,
          });
      }
    } catch (err) {
      console.error("[RegistrarDinheiro] Erro inesperado:", err);
      return res
        .status(500)
        .json({ error: "Erro ao registrar dinheiro", details: err.message });
    }
  },

  async listar(req, res) {
    try {
      const registros = await RegistroDinheiro.findAll({
        order: [["createdAt", "DESC"]],
      });
      return res.json(registros);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar registros", details: err.message });
    }
  },
};

export default registroDinheiroController;
