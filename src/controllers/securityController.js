import jwt from "jsonwebtoken";
import {
  getSecurityState,
  toggleSystemLock,
} from "../services/securityService.js";

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_MS = 60 * 1000;
const UNLOCK_COOLDOWN_MS = 30 * 1000;
const attemptsByClient = new Map();

const getClientKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || "unknown";
};

const getSecurityJwtSecret = () => {
  return process.env.SECURITY_PANEL_JWT_SECRET || process.env.JWT_SECRET;
};

export const criarSessaoSeguranca = async (req, res) => {
  const { senha } = req.body;
  const senhaPainel = process.env.SECURITY_PANEL_PASSWORD;
  const clientKey = getClientKey(req);
  const now = Date.now();

  const attemptData = attemptsByClient.get(clientKey);
  if (attemptData?.blockedUntil && attemptData.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil(
      (attemptData.blockedUntil - now) / 1000,
    );
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: `Muitas tentativas inválidas. Aguarde ${retryAfterSeconds}s para tentar novamente.`,
    });
  }

  if (!senhaPainel) {
    return res
      .status(500)
      .json({ error: "SECURITY_PANEL_PASSWORD não configurada" });
  }

  if (!senha || senha !== senhaPainel) {
    const failedCount = (attemptData?.failedCount || 0) + 1;

    if (failedCount >= MAX_FAILED_ATTEMPTS) {
      const blockedUntil = now + COOLDOWN_MS;
      attemptsByClient.set(clientKey, { failedCount: 0, blockedUntil });

      res.set("Retry-After", String(COOLDOWN_MS / 1000));
      return res.status(429).json({
        error:
          "Muitas tentativas inválidas. Aguarde 60s para tentar novamente.",
      });
    }

    attemptsByClient.set(clientKey, { failedCount, blockedUntil: null });
    return res.status(401).json({
      error: `Senha de segurança inválida. Tentativas restantes: ${MAX_FAILED_ATTEMPTS - failedCount}`,
    });
  }

  attemptsByClient.delete(clientKey);

  const token = jwt.sign({ scope: "SECURITY_PANEL" }, getSecurityJwtSecret(), {
    expiresIn: process.env.SECURITY_PANEL_TOKEN_EXPIRES_IN || "12h",
  });

  return res.json({ token });
};

export const obterStatusSeguranca = async (req, res) => {
  const state = await getSecurityState();
  let unlockCooldownSeconds = 0;

  if (state.isLocked) {
    const lockedAt = new Date(state.updatedAt).getTime();
    const elapsed = Date.now() - lockedAt;
    const remainingMs = Math.max(0, UNLOCK_COOLDOWN_MS - elapsed);
    unlockCooldownSeconds = Math.ceil(remainingMs / 1000);
  }

  return res.json({
    isLocked: state.isLocked,
    authVersion: state.authVersion,
    unlockCooldownSeconds,
  });
};

export const alternarBloqueioSistema = async (req, res) => {
  const currentState = await getSecurityState();

  if (currentState.isLocked) {
    const lockedAt = new Date(currentState.updatedAt).getTime();
    const elapsed = Date.now() - lockedAt;
    const remainingMs = Math.max(0, UNLOCK_COOLDOWN_MS - elapsed);

    if (remainingMs > 0) {
      const retryAfterSeconds = Math.ceil(remainingMs / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        error: `Aguarde ${retryAfterSeconds}s para destravar o sistema.`,
        unlockCooldownSeconds: retryAfterSeconds,
      });
    }
  }

  const state = await toggleSystemLock();

  return res.json({
    message: state.isLocked
      ? "Sistema bloqueado com sucesso"
      : "Sistema desbloqueado com sucesso",
    isLocked: state.isLocked,
    authVersion: state.authVersion,
    unlockCooldownSeconds: state.isLocked ? UNLOCK_COOLDOWN_MS / 1000 : 0,
  });
};
