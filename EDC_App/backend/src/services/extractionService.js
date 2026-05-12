const axios = require("axios");
function localFallback(documentType, originalName) {
  const number = originalName.match(/([A-Z]{2,}-?\d{2,})/)?.[1] || null;
  return { provider: "local", extractedData: { documentType, reference: number }, confidenceScore: 0.45, rawText: originalName };
}
async function extract({ documentType, objectKey, originalName, apiUrl, apiKey }) {
  if (apiUrl && apiKey) {
    try {
      const { data } = await axios.post(apiUrl, { documentType, objectKey }, { headers: { Authorization: "Bearer " + apiKey } });
      return { provider: "external", extractedData: data.data || data, confidenceScore: data.confidenceScore ?? 0.9, rawText: data.rawText || null };
    } catch (_e) {}
  }
  return localFallback(documentType, originalName);
}
module.exports = { extract };
