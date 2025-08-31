const ratesCache = { rates: {}, timestamp: 0 };

async function refreshRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data && data.result === 'success' && data.rates) {
      ratesCache.rates = data.rates;
      ratesCache.timestamp = Date.now();
      return ratesCache.rates;
    }
  } catch (e) {
    console.error('Failed to fetch rates', e);
  }
  return null;
}

function convertCurrency(amount, from, to) {
  from = from.toUpperCase();
  to = to.toUpperCase();
  if (from === to) return amount;
  const rates = ratesCache.rates;
  if (!rates[from] || !rates[to]) return null;
  const usd = from === 'USD' ? amount : amount / rates[from];
  return to === 'USD' ? usd : usd * rates[to];
}

module.exports = { refreshRates, convertCurrency };
