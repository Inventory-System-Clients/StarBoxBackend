import { WhatsAppAlerta } from "../models/index.js";
import { criarEEnviarAlertaWhatsApp } from "../services/whatsappAlertaService.js";

export const listarAlertasWhatsApp = async (req, res) => {
  try {
    const limite = Number(req.query.limite || 50);

    const alertas = await WhatsAppAlerta.findAll({
      order: [["createdAt", "DESC"]],
      limit: Number.isNaN(limite) ? 50 : limite,
    });

    res.json(alertas);
  } catch (error) {
    console.error("Erro ao listar alertas WhatsApp:", error);
    res.status(500).json({ error: "Erro ao listar alertas WhatsApp" });
  }
};

export const enviarAlertaWhatsApp = async (req, res) => {
  try {
    const {
      tipo,
      mensagem,
      destinatario,
      referenciaTipo,
      referenciaId,
      metadata,
    } = req.body;

    if (!tipo || !mensagem) {
      return res
        .status(400)
        .json({ error: "Campos obrigatórios: tipo e mensagem" });
    }

    const alerta = await criarEEnviarAlertaWhatsApp({
      tipo,
      mensagem,
      destinatario: destinatario || process.env.WHATSAPP_ALERT_DESTINO || null,
      referenciaTipo,
      referenciaId,
      metadata,
    });

    res.status(201).json(alerta);
  } catch (error) {
    console.error("Erro ao enviar alerta WhatsApp:", error);
    res.status(500).json({ error: "Erro ao enviar alerta WhatsApp" });
  }
};
