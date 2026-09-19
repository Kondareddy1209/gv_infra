import "dotenv/config";

const OVERPASS_URL =
  process.env.OVERPASS_API_URL ||
  "https://overpass-api.de/api/interpreter";

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

export async function queryOverpass(
  query,
  {
    timeoutMs = 180000,
    retries = 3,
    retryDelayMs = 3000
  } = {}
) {

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {

    const controller = new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      timeoutMs
    );

    try {

      const response = await fetch(
        OVERPASS_URL,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "KhammamRealEstateGIS/1.0"
          },

          body: new URLSearchParams({
            data: query
          }),

          signal: controller.signal
        }
      );

      clearTimeout(timer);

      if (!response.ok) {

        throw new Error(
          `Overpass HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.elements)) {
        throw new Error(
          "Invalid Overpass response"
        );
      }

      return data;

    } catch (error) {

      clearTimeout(timer);

      lastError = error;

      console.error(
        `Overpass attempt ${attempt}/${retries} failed:`,
        error.message
      );

      if (attempt < retries) {
        await sleep(
          retryDelayMs * attempt
        );
      }
    }
  }

  throw lastError;
}
