const axios = require('axios');
const { request } = require('playwright');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
};

async function downloadViaAxios(url, timeoutMs) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: timeoutMs,
    headers: DEFAULT_HEADERS,
    maxContentLength: 30 * 1024 * 1024,
    validateStatus: (status) => status >= 200 && status < 400
  });

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers['content-type'] || ''
  };
}

async function downloadViaPlaywrightRequest(url, timeoutMs) {
  const context = await request.newContext({
    extraHTTPHeaders: DEFAULT_HEADERS
  });

  try {
    const response = await context.get(url, { timeout: timeoutMs });
    if (!response.ok()) {
      throw new Error(`Playwright request failed with status ${response.status()}`);
    }

    const body = await response.body();
    return {
      buffer: Buffer.from(body),
      contentType: response.headers()['content-type'] || ''
    };
  } finally {
    await context.dispose();
  }
}

async function downloadImageBuffer(url, timeoutMs = 45000) {
  try {
    return await downloadViaAxios(url, timeoutMs);
  } catch (axiosError) {
    try {
      return await downloadViaPlaywrightRequest(url, timeoutMs);
    } catch (pwError) {
      const merged = new Error(`${axiosError.message}; fallback failed: ${pwError.message}`);
      merged.cause = { axiosError, pwError };
      throw merged;
    }
  }
}

module.exports = {
  downloadImageBuffer
};