export function getAIHeaders(aiProvider?: string, customApiKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (aiProvider) {
    headers["x-ai-provider"] = aiProvider;
  }
  if (customApiKey) {
    headers["x-custom-api-key"] = customApiKey;
  }
  return headers;
}
