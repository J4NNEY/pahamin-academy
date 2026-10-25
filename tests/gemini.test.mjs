import test from 'node:test';
import assert from 'node:assert/strict';
import { geminiError } from '../server/gemini-errors.mjs';
import { geminiRequest } from '../server/gemini-request.mjs';
import { geminiResponseSchema } from '../server/gemini-schema.mjs';
import { generateWithGemini } from '../server/gemini.mjs';

test('provider errors distinguish invalid requests, invalid keys, locked PDFs, overload and quota without leaking payloads', async () => {
  const cases = [
    [
      400,
      { message: 'Request contains an invalid argument. SECRET-EXAMPLE' },
      'GEMINI_INVALID_ARGUMENT',
      /HTTP 400/,
    ],
    [400, { details: [{ reason: 'API_KEY_INVALID' }] }, 'GEMINI_AUTH', /key Gemini ditolak/],
    [
      400,
      { message: 'Document is password protected. SECRET-EXAMPLE' },
      'GEMINI_PDF_LOCKED',
      /password/,
    ],
    [400, { message: 'Input token limit exceeded' }, 'GEMINI_INPUT_LIMIT', /batas baca/],
    [404, {}, 'GEMINI_MODEL', /GEMINI_MODEL/],
    [429, {}, 'GEMINI_QUOTA', /Kuota/],
    [503, {}, 'GEMINI_BUSY', /file tidak perlu diubah/],
    [500, { message: 'SECRET-EXAMPLE' }, 'GEMINI_PROVIDER', /HTTP 500/],
  ];
  for (const [status, error, code, message] of cases) {
    const result = await geminiError(Response.json({ error }, { status }));
    assert.equal(result.code, code);
    assert.equal(result.providerStatus, status);
    assert.match(result.message, message);
    assert.doesNotMatch(result.message, /SECRET-EXAMPLE/);
  }
  assert.equal(
    (await geminiError(new Response('not JSON', { status: 400 }))).code,
    'GEMINI_INVALID_ARGUMENT',
  );
  assert.equal(
    (await geminiError(Response.json(null, { status: 400 }))).code,
    'GEMINI_INVALID_ARGUMENT',
  );
});

test('overload retries once with the same deadline; invalid requests do not retry', async () => {
  const options = { signal: AbortSignal.timeout(5000), body: 'same upload' };
  let calls = 0,
    waits = 0;
  const response = await geminiRequest(
    'https://example.invalid',
    options,
    async (_url, received) => {
      assert.equal(received, options);
      return new Response('', { status: ++calls === 1 ? 503 : 200 });
    },
    async () => {
      waits++;
    },
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.equal(waits, 1);
  calls = 0;
  await geminiRequest(
    'https://example.invalid',
    options,
    async () => {
      calls++;
      return new Response('', { status: 400 });
    },
    async () => {
      throw new Error('must not wait');
    },
  );
  assert.equal(calls, 1);
  calls = 0;
  const unavailable = await geminiRequest(
    'https://example.invalid',
    options,
    async () => {
      calls++;
      return new Response('', { status: 503 });
    },
    async () => {},
  );
  assert.equal(unavailable.status, 503);
  assert.equal(calls, 2);
  calls = 0;
  const controller = new AbortController();
  await assert.rejects(
    geminiRequest(
      'https://example.invalid',
      { signal: controller.signal },
      async () => {
        calls++;
        return new Response('', { status: 503 });
      },
      async () => controller.abort(),
    ),
    { name: 'AbortError' },
  );
  assert.equal(calls, 1);
});

test('material and question provider grammars exclude application metadata and retain selected subject', () => {
  const material = geminiResponseSchema('Bahasa Indonesia');
  assert.equal(material.properties.curriculum, undefined);
  assert.equal(material.properties.videoUrl, undefined);
  assert.equal(material.properties.quiz.items.properties.curriculum, undefined);
  assert.deepEqual(material.properties.quiz.items.properties.subject.enum, ['Bahasa Indonesia']);
  assert.deepEqual(material.required, [
    'title',
    'subject',
    'topic',
    'summary',
    'sections',
    'keyPoints',
    'quiz',
  ]);
  const questions = geminiResponseSchema('Fisika', 'questions');
  assert.equal(questions.type, 'array');
  assert.deepEqual(questions.items.properties.subject.enum, ['Fisika']);
});

test('simplified PDF output still rejects invalid answer indexes through server validation', async () => {
  const previous = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-key';
  try {
    await assert.rejects(
      generateWithGemini(
        {
          file: { originalname: 'source.pdf', buffer: Buffer.from('%PDF-1.7\nfixture') },
          subject: 'Matematika',
          mode: 'questions',
        },
        async (_url, options) => {
          const payload = JSON.parse(options.body);
          assert.equal(payload.contents[0].parts[1].inlineData.mimeType, 'application/pdf');
          assert.equal(payload.generationConfig.temperature, undefined);
          return Response.json({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        {
                          subject: 'Matematika',
                          topic: 'Penjumlahan',
                          difficulty: 'Mudah',
                          question: 'Berapa dua tambah dua?',
                          options: ['2', '3', '4', '5'],
                          answer: 4,
                          explanation: 'Dua tambah dua sama dengan empat.',
                        },
                      ]),
                    },
                  ],
                },
              },
            ],
          });
        },
      ),
      /sesuai format/,
    );
  } finally {
    if (previous === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previous;
  }
});
