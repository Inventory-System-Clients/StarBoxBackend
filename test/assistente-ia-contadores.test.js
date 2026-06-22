import test from "node:test";
import assert from "node:assert/strict";

import {
  ErroIntegracaoOpenAI,
  extrairTextoRespostaOpenAI,
  lerContadoresComOpenAI,
  limparBlocoMarkdownJson,
  montarRequisicaoLeituraContadores,
  normalizarLeituraContadores,
  schemaLeituraContadores,
} from "../src/services/assistenteIaService.js";
import {
  criarLerContadoresPorImagem,
  prepararImagemContadores,
} from "../src/controllers/assistenteIaController.js";
import assistenteIaRoutes from "../src/routes/assistenteIa.routes.js";
import { autenticar } from "../src/middlewares/auth.js";
import {
  criarRateLimitLeituraContadores,
  resetarRateLimitLeituraContadores,
} from "../src/middlewares/assistenteIaRateLimit.js";

const createMockRes = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const respostaFetch = ({ ok = true, status = 200, payload }) => ({
  ok,
  status,
  async json() {
    return payload;
  },
});

test("rota de leitura exige autenticação antes do controller", () => {
  const layer = assistenteIaRoutes.stack.find(
    (item) => item.route?.path === "/ler-contadores",
  );

  assert.ok(layer);
  assert.equal(layer.route.methods.post, true);
  assert.equal(layer.route.stack[0].handle, autenticar);
});

test("rejeita imagem ausente com 400", async () => {
  let chamado = false;
  const controller = criarLerContadoresPorImagem({
    lerContadores: async () => {
      chamado = true;
    },
  });
  const res = createMockRes();

  await controller({ body: {}, usuario: { id: "user-1" } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /imagemBase64/);
  assert.equal(chamado, false);
});

test("rejeita MIME não permitido com 400", async () => {
  const controller = criarLerContadoresPorImagem({
    lerContadores: async () => assert.fail("não deveria chamar a OpenAI"),
  });
  const res = createMockRes();

  await controller(
    {
      body: {
        imagemBase64: "YWJj",
        mimeType: "image/gif",
      },
      usuario: { id: "user-1" },
    },
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Formato de imagem inválido/);
});

test("rejeita imagem decodificada acima de 2 MB com 413", () => {
  const base64MaiorQueLimite = Buffer.alloc(2 * 1024 * 1024 + 1).toString(
    "base64",
  );

  const resultado = prepararImagemContadores({
    imagemBase64: base64MaiorQueLimite,
    mimeType: "image/jpeg",
  });

  assert.equal(resultado.error.status, 413);
});

test("aceita Data URL e usa o MIME embutido quando mimeType não é enviado", () => {
  const resultado = prepararImagemContadores({
    imagemBase64: "data:image/png;base64,YWJj",
  });

  assert.equal(resultado.mimeType, "image/png");
  assert.equal(resultado.imagemBase64, "YWJj");
});

test("aceita JPEG, PNG e WEBP válidos", () => {
  for (const mimeType of ["image/jpeg", "image/png", "image/webp"]) {
    const resultado = prepararImagemContadores({
      imagemBase64: Buffer.from(`imagem-${mimeType}`).toString("base64"),
      mimeType,
    });

    assert.equal(resultado.error, undefined);
    assert.equal(resultado.mimeType, mimeType);
    assert.ok(resultado.tamanhoBytes > 0);
  }
});

test("rejeita Base64 inválido e buffer vazio", () => {
  assert.equal(
    prepararImagemContadores({
      imagemBase64: "%%%invalido%%%",
      mimeType: "image/jpeg",
    }).error.status,
    400,
  );

  assert.equal(
    prepararImagemContadores({
      imagemBase64: "data:image/jpeg;base64,",
      mimeType: "image/jpeg",
    }).error.status,
    400,
  );
});

test("monta input_image como Data URL e usa JSON Schema estrito", () => {
  const body = montarRequisicaoLeituraContadores({
    imagemBase64: "YWJj",
    mimeType: "image/webp",
    modelo: "modelo-teste",
  });

  assert.equal(body.model, "modelo-teste");
  assert.equal(
    body.input[0].content[1].image_url,
    "data:image/webp;base64,YWJj",
  );
  assert.equal(body.text.format.type, "json_schema");
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(body.text.format.schema, schemaLeituraContadores);
  assert.match(body.instructions, /revalidada no backend/);
});

test("transforma resposta válida e impõe maior como IN e menor como OUT", async () => {
  let requisicao;
  const resultado = await lerContadoresComOpenAI({
    imagemBase64: "YWJj",
    mimeType: "image/jpeg",
    apiKey: "chave-teste",
    fetchImpl: async (url, options) => {
      requisicao = { url, options };
      return respostaFetch({
        payload: {
          output_text: JSON.stringify({
            contadorIn: 80,
            contadorOut: 120,
            confianca: "alta",
            observacao: "Os dois contadores estão visíveis.",
          }),
        },
      });
    },
  });

  assert.equal(requisicao.url, "https://api.openai.com/v1/responses");
  assert.match(requisicao.options.headers.Authorization, /^Bearer /);
  assert.equal(resultado.contadorIn, 120);
  assert.equal(resultado.contadorOut, 80);
  assert.equal(resultado.confianca, "alta");
});

test("retorna ambos null quando a IA não lê com segurança", () => {
  assert.deepEqual(
    normalizarLeituraContadores({
      contadorIn: null,
      contadorOut: 123,
      confianca: "media",
      observacao: "Somente um contador ficou visível.",
    }),
    {
      contadorIn: null,
      contadorOut: null,
      confianca: "baixa",
      observacao: "Somente um contador ficou visível.",
    },
  );
});

test("aceita contador zero e rejeita negativo ou decimal", () => {
  assert.deepEqual(
    normalizarLeituraContadores({
      contadorIn: 12,
      contadorOut: 0,
      confianca: "alta",
      observacao: "Leitura segura.",
    }),
    {
      contadorIn: 12,
      contadorOut: 0,
      confianca: "alta",
      observacao: "Leitura segura.",
    },
  );

  for (const valorInvalido of [-1, 1.5]) {
    const resultado = normalizarLeituraContadores({
      contadorIn: 12,
      contadorOut: valorInvalido,
      confianca: "alta",
      observacao: "Leitura.",
    });
    assert.equal(resultado.contadorIn, null);
    assert.equal(resultado.contadorOut, null);
    assert.equal(resultado.confianca, "baixa");
  }
});

test("números iguais são tratados como leitura ambígua", () => {
  const resultado = normalizarLeituraContadores({
    contadorIn: 123,
    contadorOut: 123,
    confianca: "alta",
    observacao: "Leitura concluída.",
  });

  assert.equal(resultado.contadorIn, null);
  assert.equal(resultado.contadorOut, null);
  assert.equal(resultado.confianca, "baixa");
  assert.match(resultado.observacao, /iguais/);
});

test("extrai output_text também de output content", () => {
  assert.equal(
    extrairTextoRespostaOpenAI({
      output: [
        {
          content: [
            { type: "refusal", refusal: "não" },
            { type: "output_text", text: '{"contadorIn":1}' },
          ],
        },
      ],
    }),
    '{"contadorIn":1}',
  );
});

test("remove bloco Markdown antes do JSON.parse", async () => {
  assert.equal(
    limparBlocoMarkdownJson('```json\n{"contadorIn": 2}\n```'),
    '{"contadorIn": 2}',
  );

  const resultado = await lerContadoresComOpenAI({
    imagemBase64: "YWJj",
    mimeType: "image/jpeg",
    apiKey: "chave-teste",
    fetchImpl: async () =>
      respostaFetch({
        payload: {
          output_text:
            '```json\n{"contadorIn":20,"contadorOut":10,"confianca":"alta","rotulosInequivocos":false,"observacao":"Ok."}\n```',
        },
      }),
  });

  assert.equal(resultado.contadorIn, 20);
  assert.equal(resultado.contadorOut, 10);
});

test("trata erro retornado pela OpenAI sem expor credencial", async () => {
  await assert.rejects(
    lerContadoresComOpenAI({
      imagemBase64: "YWJj",
      mimeType: "image/jpeg",
      apiKey: "segredo-que-nao-pode-vazar",
      fetchImpl: async () =>
        respostaFetch({
          ok: false,
          status: 429,
          payload: { error: { message: "Limite de requisições excedido" } },
        }),
    }),
    (error) => {
      assert.equal(error instanceof ErroIntegracaoOpenAI, true);
      assert.equal(error.status, 429);
      assert.equal(error.message, "Limite de requisições excedido");
      assert.doesNotMatch(error.message, /segredo/);
      return true;
    },
  );
});

test("configuração sem OPENAI_API_KEY retorna erro interno controlado", async () => {
  await assert.rejects(
    lerContadoresComOpenAI({
      imagemBase64: "YWJj",
      mimeType: "image/jpeg",
      apiKey: "",
      fetchImpl: async () => assert.fail("não deveria chamar fetch"),
    }),
    (error) =>
      error.status === 500 && /OPENAI_API_KEY não está configurada/.test(error.message),
  );
});

test("trata resposta vazia ou JSON estruturado inválido como 502", async () => {
  await assert.rejects(
    lerContadoresComOpenAI({
      imagemBase64: "YWJj",
      mimeType: "image/jpeg",
      apiKey: "chave-teste",
      fetchImpl: async () => respostaFetch({ payload: { output: [] } }),
    }),
    (error) => error.status === 502 && /não retornou/.test(error.message),
  );

  await assert.rejects(
    lerContadoresComOpenAI({
      imagemBase64: "YWJj",
      mimeType: "image/jpeg",
      apiKey: "chave-teste",
      fetchImpl: async () =>
        respostaFetch({ payload: { output_text: "{json quebrado" } }),
    }),
    (error) => error.status === 502 && /inválido/.test(error.message),
  );
});

test("timeout da OpenAI retorna erro 504", async () => {
  await assert.rejects(
    lerContadoresComOpenAI({
      imagemBase64: "YWJj",
      mimeType: "image/jpeg",
      apiKey: "chave-teste",
      timeoutMs: 5,
      fetchImpl: async (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => {
            const error = new Error("abortado");
            error.name = "AbortError";
            reject(error);
          });
        }),
    }),
    (error) => error.status === 504 && /Tempo limite/.test(error.message),
  );
});

test("controller repassa leitura válida sem registrar o Base64", async () => {
  let argumentoRecebido;
  const controller = criarLerContadoresPorImagem({
    lerContadores: async (argumento) => {
      argumentoRecebido = argumento;
      return {
        contadorIn: 200,
        contadorOut: 100,
        confianca: "alta",
        observacao: "Visível.",
      };
    },
  });
  const res = createMockRes();

  await controller(
    {
      body: {
        imagemBase64: "data:image/jpeg;base64,YWJj",
        mimeType: "image/jpeg",
      },
      usuario: { id: "user-1" },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(argumentoRecebido, {
    imagemBase64: "YWJj",
    mimeType: "image/jpeg",
  });
  assert.equal(res.body.contadorIn, 200);
});

test("controller retorna 422 para leitura parcial ou confiança baixa", async () => {
  for (const leitura of [
    {
      contadorIn: null,
      contadorOut: null,
      confianca: "baixa",
      observacao: "Somente um contador ficou visível.",
    },
    {
      contadorIn: 20,
      contadorOut: 10,
      confianca: "baixa",
      observacao: "Imagem desfocada.",
    },
  ]) {
    const controller = criarLerContadoresPorImagem({
      lerContadores: async () => leitura,
    });
    const res = createMockRes();

    await controller(
      {
        body: { imagemBase64: "YWJj", mimeType: "image/jpeg" },
        usuario: { id: "user-1" },
      },
      res,
    );

    assert.equal(res.statusCode, 422);
    assert.equal(res.body.contadorIn, null);
    assert.equal(res.body.contadorOut, null);
  }
});

test("falha do provedor não inclui o Base64 nos logs", async () => {
  const base64Secreto = Buffer.from("imagem-secreta-unica").toString("base64");
  const originalConsoleError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  const controller = criarLerContadoresPorImagem({
    lerContadores: async () => {
      throw new ErroIntegracaoOpenAI("Provedor indisponível", { status: 502 });
    },
  });

  try {
    const res = createMockRes();
    await controller(
      {
        body: {
          imagemBase64: base64Secreto,
          mimeType: "image/jpeg",
        },
        usuario: { id: "user-1" },
      },
      res,
    );

    assert.equal(res.statusCode, 502);
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(base64Secreto));
  } finally {
    console.error = originalConsoleError;
  }
});

test("rate limit bloqueia a 11ª leitura do mesmo usuário e IP", () => {
  resetarRateLimitLeituraContadores();
  const middleware = criarRateLimitLeituraContadores({
    agora: () => 1_000,
    janelaMs: 300_000,
    maximoLeituras: 10,
  });
  const req = {
    usuario: { id: "user-rate" },
    headers: { "x-forwarded-for": "203.0.113.1" },
  };

  for (let i = 0; i < 10; i += 1) {
    const res = createMockRes();
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
  }

  const resBloqueado = {
    ...createMockRes(),
    headers: {},
    set(nome, valor) {
      this.headers[nome] = valor;
    },
  };
  let nextCalled = false;
  middleware(req, resBloqueado, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(resBloqueado.statusCode, 429);
  assert.ok(resBloqueado.headers["Retry-After"]);
  resetarRateLimitLeituraContadores();
});
