import { checkmoderation, testmoderation } from "$lib";
import OpenAI from "openai";

const API_KEY = "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";

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.groq.com/openai/v1/",
});

interface Message {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { messages }: { messages: Message[] } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid messages format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Test moderation API (with error handling)
    try {
      await testmoderation(API_KEY);
      await checkmoderation(API_KEY, messages);
    } catch (moderationError) {
      console.warn("Moderation check failed:", moderationError);
      // Continue without moderation - don't block the main request
    }

    // Convert messages to the format expected by the model
    const formattedMessages = messages.map((msg: Message) => {
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
      model: "llama3-70b-8192",
      messages: formattedMessages as any,
      stream: true,
      max_tokens: 4096,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const data = chunk.choices?.[0]?.delta?.content ?? "";
            
            if (data) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`)
              );
            }
            
            // Handle completion
            if (chunk.choices?.[0]?.finish_reason) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ finish_reason: chunk.choices[0].finish_reason })}\n\n`)
              );
            }
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (streamError) {
          console.error("Stream error:", streamError);
          
          const errorMessage = streamError instanceof Error 
            ? streamError.message 
            : "Stream processing failed";
            
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
      cancel() {
        console.log("Stream cancelled by client");
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    
    let errorMessage = "Failed to process request";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes("401") || error.message.includes("Invalid API key")) {
        statusCode = 401;
        errorMessage = "Invalid API key";
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        statusCode = 429;
        errorMessage = "Rate limit exceeded";
      } else if (error.message.includes("400")) {
        statusCode = 400;
        errorMessage = "Bad request format";
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
};