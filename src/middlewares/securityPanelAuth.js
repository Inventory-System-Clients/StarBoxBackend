import jwt from "jsonwebtoken";

const getSecurityJwtSecret = () => {
  return process.env.SECURITY_PANEL_JWT_SECRET || process.env.JWT_SECRET;
};

export const autenticarPainelSeguranca = (req, res, next) => {
  try {
    const securityToken =
      req.headers["x-security-token"] ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!securityToken) {
      return res
        .status(401)
        .json({ error: "Token de segurança não fornecido" });
    }

    const decoded = jwt.verify(securityToken, getSecurityJwtSecret());

    if (decoded.scope !== "SECURITY_PANEL") {
      return res.status(401).json({ error: "Token de segurança inválido" });
    }

    req.securitySession = decoded;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Sessão de segurança inválida ou expirada" });
  }
};
