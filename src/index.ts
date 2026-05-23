import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

/**
 * Claude HUD - A heads-up display for interacting with Claude AI
 * Provides a terminal-based interface with streaming responses
 */

const client = new Anthropic();

interface Message {
  role: "user" | "assistant";
  content: string;
}

const conversationHistory: Message[] = [];

/**
 * Stream a response from Claude and print it to stdout
 */
async function streamResponse(userMessage: string): Promise<void> {
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  process.stdout.write("\n\x1b[36mClaude:\x1b[0m ");

  let fullResponse = "";

  const stream = await client.messages.stream({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system:
      "You are Claude, a helpful AI assistant. Provide clear, concise, and accurate responses.",
    messages: conversationHistory,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      const text = chunk.delta.text;
      process.stdout.write(text);
      fullResponse += text;
    }
  }

  process.stdout.write("\n\n");

  conversationHistory.push({
    role: "assistant",
    content: fullResponse,
  });
}

/**
 * Display the HUD header
 */
function displayHeader(): void {
  console.log("\x1b[35m╔════════════════════════════╗\x1b[0m");
  console.log("\x1b[35m║       Claude HUD v1.0      ║\x1b[0m");
  console.log("\x1b[35m╚════════════════════════════╝\x1b[0m");
  console.log('\x1b[90mType your message and press Enter. Type "exit" to quit.\x1b[0m');
  console.log();
}

/**
 * Main entry point - starts the interactive HUD session
 */
async function main(): Promise<void> {
  displayHeader();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const prompt = (): void => {
    process.stdout.write("\x1b[32mYou:\x1b[0m ");
  };

  prompt();

  rl.on("line", async (input: string) => {
    const trimmed = input.trim();

    if (!trimmed) {
      prompt();
      return;
    }

    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("\x1b[90mGoodbye!\x1b[0m");
      rl.close();
      process.exit(0);
    }

    if (trimmed.toLowerCase() === "clear") {
      conversationHistory.length = 0;
      console.clear();
      displayHeader();
      console.log("\x1b[90mConversation history cleared.\x1b[0m\n");
      prompt();
      return;
    }

    try {
      await streamResponse(trimmed);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n\x1b[31mError: ${error.message}\x1b[0m\n`);
      } else {
        console.error("\n\x1b[31mAn unexpected error occurred\x1b[0m\n");
      }
    }

    prompt();
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
