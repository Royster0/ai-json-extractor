import "dotenv/config";
import fs from "node:fs";
import { extractOrder } from "./lib/extract-order.js";

async function main() {
  const argText = process.argv.slice(2).join("").trim();

  const stdinText = !process.stdin.isTTY
    ? fs.readFileSync(0, "utf8").trim()
    : "";

  const input = argText || stdinText;

  if (!input) {
    console.error(
      `
        Usage:
            npm run extract -- "Order-12345 successfully started • Host: aep02 • Acres: 184.2 • Validation Results: Passed"
        
        Or:
            cat samples/order.txt | npm run extract
        `.trim(),
    );

    process.exit(1);
  }

  try {
    const result = await extractOrder(input);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log("Extraction failed");

    if (error instanceof Error) {
      console.log(error.message);
    } else {
      console.log(error);
    }

    process.exit(1);
  }
}

main();
