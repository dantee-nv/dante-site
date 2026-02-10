export function normalizeEnvUrlValue(rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  const hasMatchingQuotes =
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  const normalized = hasMatchingQuotes ? trimmed.slice(1, -1).trim() : trimmed;
  return normalized;
}
