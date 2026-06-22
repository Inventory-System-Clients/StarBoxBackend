const JANELA_MS = 5 * 60 * 1000;
const MAXIMO_LEITURAS = 10;
const acessos = new Map();

const obterIp = (req) => {
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "ip-desconhecido";
};

const limparExpirados = (agora) => {
  for (const [chave, registro] of acessos.entries()) {
    if (registro.expiraEm <= agora) {
      acessos.delete(chave);
    }
  }
};

export const resetarRateLimitLeituraContadores = () => acessos.clear();

export const criarRateLimitLeituraContadores =
  ({
    agora = () => Date.now(),
    janelaMs = JANELA_MS,
    maximoLeituras = MAXIMO_LEITURAS,
  } = {}) =>
  (req, res, next) => {
    const momentoAtual = agora();
    limparExpirados(momentoAtual);

    const usuarioId = req.usuario?.id || "usuario-desconhecido";
    const chave = `${usuarioId}:${obterIp(req)}`;
    const registro = acessos.get(chave);

    if (!registro || registro.expiraEm <= momentoAtual) {
      acessos.set(chave, {
        quantidade: 1,
        expiraEm: momentoAtual + janelaMs,
      });
      return next();
    }

    if (registro.quantidade >= maximoLeituras) {
      const retryAfterSegundos = Math.max(
        1,
        Math.ceil((registro.expiraEm - momentoAtual) / 1000),
      );
      res.set?.("Retry-After", String(retryAfterSegundos));
      return res.status(429).json({
        error: "Limite de leituras por imagem excedido",
        message: "Aguarde alguns minutos antes de tentar novamente.",
      });
    }

    registro.quantidade += 1;
    return next();
  };

export const limitarLeituraContadores = criarRateLimitLeituraContadores();

