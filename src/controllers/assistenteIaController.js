import {
  ErroIntegracaoOpenAI,
  lerContadoresComOpenAI,
} from "../services/assistenteIaService.js";

const MIME_TYPES_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const LIMITE_IMAGEM_BYTES = 2 * 1024 * 1024;
const DATA_URL_REGEX = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/i;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

const decodificarBase64Estrito = (valor) => {
  if (
    !BASE64_REGEX.test(valor) ||
    valor.length % 4 === 1 ||
    /\s/.test(valor)
  ) {
    return null;
  }

  const buffer = Buffer.from(valor, "base64");
  if (buffer.length === 0) return null;

  const entradaCanonica = valor.replace(/=+$/, "");
  const bufferCanonico = buffer.toString("base64").replace(/=+$/, "");
  return entradaCanonica === bufferCanonico ? buffer : null;
};

export const prepararImagemContadores = ({
  imagemBase64,
  mimeType,
} = {}) => {
  if (typeof imagemBase64 !== "string" || !imagemBase64.trim()) {
    return {
      error: {
        status: 400,
        message: "imagemBase64 é obrigatória",
      },
    };
  }

  const valorOriginal = imagemBase64.trim();
  const matchDataUrl = valorOriginal.match(DATA_URL_REGEX);
  const mimeDataUrl = matchDataUrl?.[1]?.toLowerCase();
  const mimeNormalizado = String(mimeType || mimeDataUrl || "image/jpeg")
    .trim()
    .toLowerCase();
  const base64Limpo = valorOriginal
    .replace(DATA_URL_REGEX, "")
    .trim();

  if (!MIME_TYPES_PERMITIDOS.has(mimeNormalizado)) {
    return {
      error: {
        status: 400,
        message:
          "Formato de imagem inválido. Use JPEG, PNG ou WEBP.",
      },
    };
  }

  const bufferImagem = decodificarBase64Estrito(base64Limpo);
  if (!bufferImagem) {
    return {
      error: {
        status: 400,
        message: "O conteúdo Base64 da imagem é inválido",
      },
    };
  }

  if (bufferImagem.length > LIMITE_IMAGEM_BYTES) {
    return {
      error: {
        status: 413,
        message: "A imagem deve ter no máximo 2 MB",
      },
    };
  }

  return {
    imagemBase64: base64Limpo,
    mimeType: mimeNormalizado,
    tamanhoBytes: bufferImagem.length,
  };
};

export const criarLerContadoresPorImagem =
  ({ lerContadores = lerContadoresComOpenAI } = {}) =>
  async (req, res) => {
    const imagem = prepararImagemContadores(req.body);

    if (imagem.error) {
      return res.status(imagem.error.status).json({
        error: "Erro ao ler contadores por imagem",
        message: imagem.error.message,
      });
    }

    try {
      const leitura = await lerContadores({
        imagemBase64: imagem.imagemBase64,
        mimeType: imagem.mimeType,
      });

      if (
        leitura?.confianca === "baixa" ||
        leitura?.contadorIn === null ||
        leitura?.contadorOut === null
      ) {
        return res.status(422).json({
          contadorIn: null,
          contadorOut: null,
          confianca: "baixa",
          observacao:
            leitura?.observacao ||
            "Não foi possível identificar claramente os dois contadores.",
        });
      }

      return res.status(200).json(leitura);
    } catch (error) {
      const status =
        error instanceof ErroIntegracaoOpenAI ? error.status : 500;
      const message =
        error instanceof ErroIntegracaoOpenAI
          ? error.message
          : "Falha inesperada ao processar a imagem";

      console.error("[assistente-ia] erro ao ler contadores", {
        usuarioId: req.usuario?.id || null,
        mimeType: imagem.mimeType,
        tamanhoBytes: imagem.tamanhoBytes,
        status,
        motivo: message,
      });

      return res.status(status).json({
        error: "Erro ao ler contadores por imagem",
        message,
      });
    }
  };

export const lerContadoresPorImagem = criarLerContadoresPorImagem();
