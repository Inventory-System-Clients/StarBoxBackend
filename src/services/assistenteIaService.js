const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODELO_PADRAO =
  process.env.OPENAI_VISION_MODEL ||
  process.env.OPENAI_MODEL ||
  "gpt-4.1-mini";
const TIMEOUT_OPENAI_MS = 20_000;

export const schemaLeituraContadores = {
  type: "object",
  additionalProperties: false,
  required: [
    "contadorIn",
    "contadorOut",
    "confianca",
    "rotulosInequivocos",
    "observacao",
  ],
  properties: {
    contadorIn: { type: ["integer", "null"] },
    contadorOut: { type: ["integer", "null"] },
    confianca: {
      type: "string",
      enum: ["alta", "media", "baixa"],
    },
    rotulosInequivocos: { type: "boolean" },
    observacao: { type: "string" },
  },
};

const instrucoesLeituraContadores = `
Analise a fotografia de um painel de máquina que contém dois contadores numéricos: IN e OUT.
Retorne apenas JSON conforme o schema.
Leia somente os números brancos dentro das janelas pretas dos contadores mecânicos.
Ignore voltímetro, régua, parafusos, cabos, madeira, etiquetas e qualquer outro número fora dos contadores.
Leia apenas números dos contadores físicos ou digitais.
Não invente, complete ou estime dígitos ilegíveis.
Informe em rotulosInequivocos se os rótulos IN e OUT estavam claramente visíveis.
Se não houver exatamente dois valores seguros, use confiança baixa.
Retorne inteiros não negativos ou null.
A associação visual da IA será revalidada no backend.
Se os dois números forem iguais, a classificação é ambígua: retorne ambos null e confiança baixa.
Se não conseguir ler os dois com segurança, retorne contadorIn null, contadorOut null e confiança baixa.
Não chute. Prefira null se estiver em dúvida.
`.trim();

export class ErroIntegracaoOpenAI extends Error {
  constructor(message, { status = 502, cause } = {}) {
    super(message, { cause });
    this.name = "ErroIntegracaoOpenAI";
    this.status = status;
  }
}

export const extrairTextoRespostaOpenAI = (payload) => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const conteudo of Array.isArray(item?.content) ? item.content : []) {
      if (
        conteudo?.type === "output_text" &&
        typeof conteudo.text === "string" &&
        conteudo.text.trim()
      ) {
        return conteudo.text.trim();
      }
    }
  }

  return null;
};

const inteiroNaoNegativoOuNull = (valor) =>
  Number.isSafeInteger(valor) && valor >= 0 ? valor : null;

export const normalizarLeituraContadores = (leitura) => {
  const primeiro = inteiroNaoNegativoOuNull(leitura?.contadorIn);
  const segundo = inteiroNaoNegativoOuNull(leitura?.contadorOut);
  const confiancaPermitida = ["alta", "media", "baixa"].includes(
    leitura?.confianca,
  )
    ? leitura.confianca
    : "baixa";
  const observacao =
    typeof leitura?.observacao === "string" && leitura.observacao.trim()
      ? leitura.observacao.trim()
      : "Não foi possível ler os dois contadores com segurança.";

  if (
    primeiro === null ||
    segundo === null ||
    primeiro === segundo ||
    confiancaPermitida === "baixa"
  ) {
    return {
      contadorIn: null,
      contadorOut: null,
      confianca: "baixa",
      observacao:
        primeiro !== null && primeiro === segundo
          ? "Os dois números lidos são iguais e não permitem classificar IN e OUT com segurança."
          : observacao,
    };
  }

  return {
    contadorIn: Math.max(primeiro, segundo),
    contadorOut: Math.min(primeiro, segundo),
    confianca: confiancaPermitida,
    observacao,
  };
};

const obterMensagemErroOpenAI = (payload, status) => {
  const mensagem =
    payload?.error?.message ||
    payload?.message ||
    `A OpenAI respondeu com status ${status}`;
  return String(mensagem).slice(0, 500);
};

const statusPublicoOpenAI = (status) => {
  if (status === 429) return 429;
  if (status >= 500 && status <= 599) return 502;
  return 502;
};

export const montarRequisicaoLeituraContadores = ({
  imagemBase64,
  mimeType,
  modelo = MODELO_PADRAO,
}) => ({
  model: modelo,
  instructions: instrucoesLeituraContadores,
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Leia os dois contadores mecânicos da foto. O maior número é IN e o menor é OUT.",
        },
        {
          type: "input_image",
          image_url: `data:${mimeType};base64,${imagemBase64}`,
        },
      ],
    },
  ],
  text: {
    format: {
      type: "json_schema",
      name: "leitura_contadores",
      strict: true,
      schema: schemaLeituraContadores,
    },
  },
  max_output_tokens: 300,
});

export const limparBlocoMarkdownJson = (texto) => {
  const valor = String(texto || "").trim();
  const match = valor.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : valor;
};

export const lerContadoresComOpenAI = async ({
  imagemBase64,
  mimeType,
  apiKey = process.env.OPENAI_API_KEY,
  modelo =
    process.env.OPENAI_VISION_MODEL ||
    process.env.OPENAI_MODEL ||
    MODELO_PADRAO,
  fetchImpl = globalThis.fetch,
  timeoutMs = TIMEOUT_OPENAI_MS,
}) => {
  if (!apiKey) {
    throw new ErroIntegracaoOpenAI(
      "OPENAI_API_KEY não está configurada no servidor",
      { status: 500 },
    );
  }

  if (typeof fetchImpl !== "function") {
    throw new ErroIntegracaoOpenAI(
      "O runtime do servidor não possui um cliente HTTP compatível",
      { status: 500 },
    );
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        montarRequisicaoLeituraContadores({
          imagemBase64,
          mimeType,
          modelo,
        }),
      ),
      signal: abortController.signal,
    });
  } catch (error) {
    if (
      abortController.signal.aborted ||
      error?.name === "AbortError" ||
      error?.name === "TimeoutError"
    ) {
      throw new ErroIntegracaoOpenAI(
        "Tempo limite excedido ao processar a imagem",
        { status: 504, cause: error },
      );
    }
    throw new ErroIntegracaoOpenAI(
      "Falha de comunicação com o serviço de leitura de imagem",
      { status: 502, cause: error },
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ErroIntegracaoOpenAI(
      "A OpenAI retornou uma resposta que não é JSON",
      { status: 502, cause: error },
    );
  }

  if (!response.ok) {
    throw new ErroIntegracaoOpenAI(
      obterMensagemErroOpenAI(payload, response.status),
      { status: statusPublicoOpenAI(response.status) },
    );
  }

  const texto = extrairTextoRespostaOpenAI(payload);
  if (!texto) {
    throw new ErroIntegracaoOpenAI(
      "A OpenAI não retornou o resultado estruturado da leitura",
      { status: 502 },
    );
  }

  let leitura;
  try {
    leitura = JSON.parse(limparBlocoMarkdownJson(texto));
  } catch (error) {
    throw new ErroIntegracaoOpenAI(
      "A OpenAI retornou um resultado estruturado inválido",
      { status: 502, cause: error },
    );
  }

  return normalizarLeituraContadores(leitura);
};
