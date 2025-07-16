import { checkmoderation, testmoderation } from "$lib";
import OpenAI from "openai";

const API_KEY = "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";

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.groq.com/openai/v1/",
});
await testmoderation(API_KEY); // test if we can use the moderation api
export async function POST({ request }) {
  const { messages } = await request.json();
  await checkmoderation(API_KEY, messages); // call the moderation model

  // Convert messages to the format expected by the model
  const formattedMessages = messages.map((msg: any) => {
    if (Array.isArray(msg.content)) {
      // Multimodal message (text + image)
      return {
        role: msg.role,
        content: msg.content,
      };
    } else {
      // Text-only message
      return {
        role: msg.role,
        content: msg.content,
      };
    }
  });

  const response = await openai.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct", // highest tokens per minute limit
    messages: formattedMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const data = chunk.choices?.[0]?.delta?.content ?? "";
        let reasoning = "";
        if (
          chunk.choices?.[0]?.delta &&
          typeof chunk.choices[0].delta === "object" &&
          "reasoning" in chunk.choices[0].delta
        ) {
          reasoning = String(chunk.choices[0].delta.reasoning ?? "");
        } else if (typeof chunk === "object" && "reasoning" in chunk) {
          reasoning = String((chunk as any).reasoning ?? "");
        }
        if (data) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`),
          );
        }
        if (reasoning) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ reasoning })}\n\n`),
          );
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
