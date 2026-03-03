import { WhatsAppAlerta } from "../models/index.js";

const montarMensagemRoteiroPendente = ({
  roteiroNome,
  maquinasPendentes = [],
}) => {
  const listaPendencias = maquinasPendentes
    .map((item) => `${item.maquinaNome} (${item.lojaNome})`)
    .join(", ");

  return `⚠️ Roteiro concluído com pendência\nRoteiro: ${roteiroNome}\nMáquinas não realizadas: ${listaPendencias}`;
};

const enviarMensagemWhatsApp = async ({ destinatario, mensagem }) => {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!destinatario) {
    throw new Error("Destinatário do WhatsApp não informado");
  }

  if (!accessToken || !phoneNumberId) {
    throw new Error(
      "Configuração WhatsApp ausente (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)",
    );
  }

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: destinatario,
        type: "text",
        text: {
          body: mensagem,
        },
      }),
    },
  );

  if (!response.ok) {
    const erroApi = await response.text();
    throw new Error(`Falha no envio WhatsApp: ${erroApi}`);
  }

  return response.json();
};

export const criarEEnviarAlertaWhatsApp = async ({
  tipo,
  mensagem,
  destinatario,
  referenciaTipo,
  referenciaId,
  metadata,
}) => {
  const alerta = await WhatsAppAlerta.create({
    tipo,
    mensagem,
    destinatario,
    referenciaTipo,
    referenciaId,
    metadata,
    status: "pendente",
  });

  try {
    const retornoEnvio = await enviarMensagemWhatsApp({
      destinatario,
      mensagem,
    });
    await alerta.update({
      status: "enviado",
      erro: null,
      enviadoEm: new Date(),
      metadata: {
        ...(metadata || {}),
        envio: retornoEnvio,
      },
    });
  } catch (error) {
    await alerta.update({
      status: "erro",
      erro: error.message,
    });
  }

  return alerta;
};

export const criarAlertaRoteiroPendente = async ({
  roteiroId,
  roteiroNome,
  maquinasPendentes,
}) => {
  const destinatarioPadrao = process.env.WHATSAPP_ALERT_DESTINO || null;
  const mensagem = montarMensagemRoteiroPendente({
    roteiroNome,
    maquinasPendentes,
  });

  return criarEEnviarAlertaWhatsApp({
    tipo: "ROTEIRO_FINALIZADO_COM_PENDENCIA",
    mensagem,
    destinatario: destinatarioPadrao,
    referenciaTipo: "roteiro",
    referenciaId: roteiroId,
    metadata: {
      maquinasPendentes,
    },
  });
};
