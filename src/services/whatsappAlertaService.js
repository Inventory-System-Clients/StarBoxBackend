import AlertManager from "./alertManager.js";

export const criarEEnviarAlertaWhatsApp = async ({
  tipo,
  mensagem,
  destinatario,
  referenciaTipo,
  referenciaId,
  metadata,
}) => {
  return AlertManager.enviarCustom({
    tipo,
    mensagem,
    destinatario,
    referenciaTipo,
    referenciaId,
    metadata,
  });
};

export const criarAlertaRoteiroPendente = async ({
  roteiroId,
  roteiroNome,
  maquinasPendentes,
  destinatario,
}) => {
  return AlertManager.roteiroComPendencia({
    roteiroId,
    roteiroNome,
    maquinasPendentes,
    destinatario,
  });
};
