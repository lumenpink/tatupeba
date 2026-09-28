const RETRY_MAX = 3;
const RETRY_BASE_DELAY_MS = 1000;

async function fetchWithRetry(url, options, attempt = 1) {
  try {
    const res = await fetch(url, options);
    if (res.status === 429 || res.status >= 500) {
      if (attempt <= RETRY_MAX) {
        const retryAfter = Number.parseInt(res.headers.get('retry-after') || '0', 10);
        const delay = retryAfter > 0 ? retryAfter * 1000 : RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, attempt + 1);
      }
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Zotero API erro ${res.status} (${res.statusText}): ${body}`);
    }
    return res;
  } catch (err) {
    if (attempt <= RETRY_MAX) {
      const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }
    throw err;
  }
}

export async function fetchAllItems(config, onProgress) {
  const { userId, apiKey, apiVersion = '3' } = config;
  const headers = {
    'Zotero-API-Version': apiVersion,
    Authorization: `Bearer ${apiKey}`
  };

  let allData = [];
  let start = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.zotero.org/users/${userId}/items?limit=${limit}&start=${start}`;
    if (onProgress) {
      onProgress({ action: 'fetch_items', start, limit, totalFetched: allData.length });
    }
    const res = await fetchWithRetry(url, { headers });
    const chunk = await res.json();
    allData = allData.concat(chunk);

    const linkHeader = res.headers.get('link');
    if (linkHeader?.includes('rel="next"')) {
      start += limit;
    } else if (chunk.length >= limit) {
      start += limit;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export async function fetchBibTeX(config, onProgress) {
  const { userId, apiKey, apiVersion = '3' } = config;
  const headers = {
    'Zotero-API-Version': apiVersion,
    Authorization: `Bearer ${apiKey}`
  };

  let fullBib = '';
  let start = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.zotero.org/users/${userId}/items?format=bibtex&limit=${limit}&start=${start}`;
    if (onProgress) {
      onProgress({ action: 'fetch_bibtex', start, limit });
    }
    const res = await fetchWithRetry(url, { headers });
    const chunk = await res.text();
    fullBib += chunk;

    const linkHeader = res.headers.get('link');
    if (linkHeader?.includes('rel="next"')) {
      start += limit;
    } else {
      hasMore = false;
    }
  }

  return fullBib;
}

export function organizeEntities(items) {
  const references = [];
  const attachments = [];
  const annotations = [];

  for (const item of items) {
    const type = item.data?.itemType;
    if (type === 'attachment') {
      attachments.push(item.data);
    } else if (type === 'annotation') {
      annotations.push(item.data);
    } else {
      references.push(item.data);
    }
  }

  const pdfsByReference = {};
  for (const att of attachments) {
    const parentKey = att.parentItem;
    if (!parentKey) continue;
    if (!pdfsByReference[parentKey]) {
      pdfsByReference[parentKey] = [];
    }
    pdfsByReference[parentKey].push(att);
  }

  const annotationsByPdf = {};
  for (const ann of annotations) {
    const parentKey = ann.parentItem;
    if (!parentKey) continue;
    if (!annotationsByPdf[parentKey]) {
      annotationsByPdf[parentKey] = [];
    }
    annotationsByPdf[parentKey].push(ann);
  }

  return {
    references,
    attachments,
    annotations,
    pdfsByReference,
    annotationsByPdf
  };
}
