import OpenAI from 'openai';

const OPENROUTER_API_KEY = "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"; // replace with your own api key, im not paying for the ai

const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'X-Title': 'Flicker AI'
  }
});

export async function POST({ request }) {
  const { messages } = await request.json();

  const response = await openai.chat.completions.create({
    model: 'tencent/hunyuan-a13b-instruct:free',
    messages,
    stream: true
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const data = chunk.choices?.[0]?.delta?.content ?? '';
        let reasoning = '';
        if (chunk.choices?.[0]?.delta && typeof chunk.choices[0].delta === 'object' && 'reasoning' in chunk.choices[0].delta) {
          reasoning = String(chunk.choices[0].delta.reasoning ?? '');
        } else if (typeof chunk === 'object' && 'reasoning' in chunk) {
          reasoning = String((chunk as any).reasoning ?? '');
        }
        if (data) {
          // Remove <answer> tags
          const clean = data.replace(/<answer>|<\/answer>/g, '');
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: clean })}\n\n`));
        }
        if (reasoning) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ reasoning })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
} 