import AlertManager from "./alertManager.js";

export const criarEEnviarAlertaWhatsApp = async ({
  tipo,
  mensagem,
  destinatario,
  referenciaTipo,
  referenciaId,
  metadata,
  options,
}) => {
  return AlertManager.enviarCustom({
    tipo,
    mensagem,
    destinatario,
    referenciaTipo,
    referenciaId,
    metadata,
    options,
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
