# AI JSON Extractor

A small TypeScript CLI that extracts structured JSON from messy operational text using the OpenRouter API. I also chose to use the Owl Alpha free model.

This project is meant to demonstrate a practical AI engineering pattern:

```txt
messy text → LLM extraction → JSON parsing → Zod validation → deterministic post-processing
```

* Uses OpenRouter’s OpenAI-compatible API
* Extracts order data from messy text
* Returns clean, validated JSON
* Validates model output with Zod
* Derives deterministic fields in code, such as upload type
* Includes simple CLI usage for local testing
* Handles retries and rate limiting
* Tracks token usage and cost
* Resusable prompt builders
* Structured JSON logging

## Example Input

```txt
Order-12345 successfully started • Host: aep01 • Acres: 1337 • Validation Results: Passed
```

## Example Output

```json
{
  "orderNumber": "12345",
  "aep": "aep01",
  "acres": 1337,
  "validationStatus": "Passed",
  "submittedAt": null,
  "confidence": 1,
  "missingFields": ["submittedAt"],
  "notes": "No submitted timestamp was provided.",
  "uploadType": "Field"
}
```

## Setup

Clone
npm install
Create a .env file with your OpenRouter key
Run the extractor in terminal
```bash
npm run extract -- "Order-15973 successfully started • Host: aep02 • Acres: 184.2 • Validation Results: Passed"
```

## Todo
* Tool calling
* Streaming
