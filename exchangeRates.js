const API_URL = 'https://api.exchangerate.host/latest';
const cache = {};
const TTL = 3600 * 1000; // 1 hour

async function getRate(from, to) {
  from = from.toUpperCase();
  to = to.toUpperCase();
  const now = Date.now();
  const entry = cache[from];
  if (entry && now - entry.timestamp < TTL) {
    return entry.rates[to];
  }
  const res = await fetch(`${API_URL}?base=${from}`);
  if (!res.ok) throw new Error('Failed to fetch rates');
  const data = await res.json();
  cache[from] = { rates: data.rates || {}, timestamp: now };
  return cache[from].rates[to];
}

function clearCache() {
  Object.keys(cache).forEach(k => delete cache[k]);
}

module.exports = { getRate, clearCache };
