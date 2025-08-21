import { checkmoderation, testmoderation } from "$lib";
import OpenAI from "openai";


const API_KEY = process.env.GROQ_API_KEY;


if (!API_KEY) {
  throw new Error("GROQ_API_KEY environment variable is not set");
}

const openai = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.groq.com/openai/v1/",
});

interface Message {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface UserUsage {
  count: number;
  lastReset: string;
  firstUsage: string;
}

const userUsageMap = new Map<string, UserUsage>();

const DAILY_USAGE_LIMIT = 40;

const ADVANCED_FEATURES = {
  maxTokensBonus: 1000, 
  temperatureRange: { min: 0.1, max: 1.0 }, 
  enableVisionModel: true, 
  enableCodeOptimization: true, 
  enableContextualMemory: true, 
};

function getUserId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    return `auth_${authHeader.slice(0, 20)}`; 
  }
  
  return `ip_${ip}`;
}

function checkDailyUsage(userId: string): { allowed: boolean; remaining: number; resetTime: string } {
  const now = new Date();
  const nowTimestamp = now.getTime();
  
  let userUsage = userUsageMap.get(userId);
  
  if (!userUsage) {
    userUsage = {
      count: 0,
      lastReset: now.toISOString(),
      firstUsage: now.toISOString()
    };
    userUsageMap.set(userId, userUsage);
  } else {
    const lastResetTime = new Date(userUsage.lastReset).getTime();
    const hoursElapsed = (nowTimestamp - lastResetTime) / (1000 * 60 * 60);
    if (hoursElapsed >= 24) {
      userUsage = {
        count: 0,
        lastReset: now.toISOString(),
        firstUsage: userUsage.firstUsage 
      };
      userUsageMap.set(userId, userUsage);
    }
  }
  
  const allowed = userUsage.count < DAILY_USAGE_LIMIT;
  const remaining = Math.max(0, DAILY_USAGE_LIMIT - userUsage.count);
  
  const nextReset = new Date(new Date(userUsage.lastReset).getTime() + (24 * 60 * 60 * 1000));
  
  return {
    allowed,
    remaining,
    resetTime: nextReset.toISOString()
  };
}

function incrementUsage(userId: string): void {
  const userUsage = userUsageMap.get(userId);
  if (userUsage) {
    userUsage.count += 1;
    userUsageMap.set(userId, userUsage);
  }
}

function determineAdvancedSettings(messages: Message[], hasImages: boolean) {
  const lastMessage = messages[messages.length - 1];
  const content = typeof lastMessage.content === 'string' ? lastMessage.content : 
    Array.isArray(lastMessage.content) ? lastMessage.content.map(item => item.text || '').join(' ') : '';
  
  const isCodingRequest = /\b(code|function|class|component|algorithm|programming|debug|fix|build|create.*app|javascript|typescript|python|react|svelte|css|html|api|database|sql)\b/i.test(content);
  const isComplexQuery = content.length > 200 || /\b(analyze|explain|compare|detailed|comprehensive|step.*by.*step)\b/i.test(content);
  const isCreativeRequest = /\b(write|story|poem|creative|generate|design|brainstorm)\b/i.test(content);
  const isMathRequest = /\b(calculate|math|formula|equation|solve|statistics|data)\b/i.test(content);
  
  let modelToUse = "llama-3.1-8b-instant"; 
  
  if (hasImages && ADVANCED_FEATURES.enableVisionModel) {
    modelToUse = "meta-llama/llama-4-scout-17b-16e-instruct";
  } else if (isCodingRequest || isComplexQuery) {
    modelToUse = "llama-3.3-70b-versatile"; 
  }
  
  let maxTokens = 500; 
  if (isCodingRequest && ADVANCED_FEATURES.enableCodeOptimization) {
    maxTokens = 2500 + ADVANCED_FEATURES.maxTokensBonus;
  } else if (isComplexQuery || isCreativeRequest) {
    maxTokens = 1500 + ADVANCED_FEATURES.maxTokensBonus;
  } else if (hasImages) {
    maxTokens = 800;
  }
  
  let temperature = 0.2; 
  if (isCreativeRequest) {
    temperature = 0.8;
  } else if (isMathRequest || isCodingRequest) {
    temperature = 0.1;
  } else if (hasImages) {
    temperature = 0.3;
  }
  
  temperature = Math.max(ADVANCED_FEATURES.temperatureRange.min, 
                        Math.min(ADVANCED_FEATURES.temperatureRange.max, temperature));
  
  return {
    model: modelToUse,
    maxTokens,
    temperature,
    isCodingRequest,
    isComplexQuery,
    isCreativeRequest,
    isMathRequest
  };
}

export const POST = async ({ request }) => {
  try {
    const userId = getUserId(request);
    const usageStatus = checkDailyUsage(userId);
    
    if (!usageStatus.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Daily usage limit exceeded",
          limit: DAILY_USAGE_LIMIT,
          remaining: 0,
          resetTime: usageStatus.resetTime,
          message: `You have reached your daily limit of ${DAILY_USAGE_LIMIT} questions. Your usage will reset in ${Math.ceil((new Date(usageStatus.resetTime).getTime() - Date.now()) / (1000 * 60 * 60))} hours.`
        }),
        {
          status: 429, 
          headers: { 
            "Content-Type": "application/json",
            "X-RateLimit-Limit": DAILY_USAGE_LIMIT.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": usageStatus.resetTime,
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

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

    incrementUsage(userId);
    const updatedUsage = checkDailyUsage(userId);

    try {
      await testmoderation(API_KEY);
      await checkmoderation(API_KEY, messages);
    } catch (moderationError) {
      console.warn("Moderation check failed:", moderationError);
    }

    const hasImages = messages.some(msg => 
      Array.isArray(msg.content) && 
      msg.content.some(item => item.type === 'image_url')
    );

    const settings = determineAdvancedSettings(messages, hasImages);

    const formattedMessages = messages.map((msg: Message) => {
      if (Array.isArray(msg.content)) {
        const formattedContent = msg.content.map(item => {
          if (item.type === 'image_url' && item.image_url) {
            return {
              type: 'image_url',
              image_url: {
                url: item.image_url.url,
                detail: "high" 
              }
            };
          } else if (item.type === 'text' && item.text) {
            return {
              type: 'text',
              text: item.text
            };
          }
          return item;
        });
        
        return {
          role: msg.role,
          content: formattedContent,
        };
      } else {
        return {
          role: msg.role,
          content: msg.content,
        };
      }
    });

    console.log("Using model:", settings.model);
    console.log("Advanced settings:", settings);
    console.log("User usage remaining:", updatedUsage.remaining);
    
    const response = await openai.chat.completions.create({
      model: settings.model,
      messages: formattedMessages as any,
      stream: true,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      top_p: settings.isCreativeRequest ? 0.95 : 0.9,
      frequency_penalty: settings.isCodingRequest ? 0.0 : 0.1, 
      presence_penalty: settings.isComplexQuery ? 0.2 : 0.1, 
      ...(settings.isMathRequest && {
        logit_bias: { "29871": -5 }, 
      }),
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              usage_info: {
                remaining: updatedUsage.remaining,
                resetTime: updatedUsage.resetTime,
                model: settings.model,
                advanced_features: true
              }
            })}\n\n`)
          );

          for await (const chunk of response) {
            const data = chunk.choices?.[0]?.delta?.content ?? "";
            
            if (data) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`)
              );
            }
            
            if (chunk.choices?.[0]?.finish_reason) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  finish_reason: chunk.choices[0].finish_reason,
                  final_usage: {
                    remaining: updatedUsage.remaining,
                    resetTime: updatedUsage.resetTime
                  }
                })}\n\n`)
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
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "X-RateLimit-Limit": DAILY_USAGE_LIMIT.toString(),
        "X-RateLimit-Remaining": updatedUsage.remaining.toString(),
        "X-RateLimit-Reset": updatedUsage.resetTime,
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    
    let errorMessage = "Failed to process request";
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes("401") || error.message.includes("Invalid API key")) {
        statusCode = 401;
        errorMessage = "Invalid API key";
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        statusCode = 429;
        errorMessage = "Rate limit exceeded";
      } else if (error.message.includes("400")) {
        statusCode = 400;
        errorMessage = "Bad request format - " + error.message;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        advanced_features_available: true
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

export const GET = async ({ request }) => {
  const userId = getUserId(request);
  const usageStatus = checkDailyUsage(userId);
  
  return new Response(
    JSON.stringify({
      limit: DAILY_USAGE_LIMIT,
      remaining: usageStatus.remaining,
      resetTime: usageStatus.resetTime,
      advanced_features: ADVANCED_FEATURES
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      }
    }
  );
};