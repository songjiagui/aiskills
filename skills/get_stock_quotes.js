const https = require('https');

const stocks = [
  {
    name: '中证银行',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=2399986&marketType=4&marketCode=31&lotSize=100&spreadCode=100&underlyingStockId=0&instrumentType=6&subInstrumentType=6001&_=1773674433342',
    quoteToken: '3e7f3c5f6b'
  },
  {
    name: '保险主题',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=2399809&marketType=4&marketCode=31&lotSize=100&spreadCode=100&underlyingStockId=0&instrumentType=6&subInstrumentType=6001&_=1773912368883',
    quoteToken: '4d56ef5e6f'
  },
  {
    name: '电池 ETF 汇添富',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=81879258690740&marketType=4&marketCode=31&lotSize=100&spreadCode=102&underlyingStockId=0&instrumentType=4&subInstrumentType=4002&_=1773913354084',
    quoteToken: 'f9309d400d'
  },
  {
    name: '恒生科技',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=71002804&marketType=1&marketCode=114&lotSize=50&spreadCode=4&underlyingStockId=800700&instrumentType=9&subInstrumentType=9002&_=1773673848148',
    quoteToken: '34a4a9efcb'
  },
  {
    name: '绿色电力',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=2399438&marketType=4&marketCode=31&lotSize=100&spreadCode=100&underlyingStockId=0&instrumentType=6&subInstrumentType=6001&_=1776484497102',
    quoteToken: 'a1d44e02bf'
  },
  {
    name: '电网设备ETF国泰',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=86238649897764&marketType=4&marketCode=30&lotSize=100&spreadCode=102&underlyingStockId=0&instrumentType=4&subInstrumentType=4002&_=1776488816107',
    quoteToken: '576d529441'
  },
  {
    name: '港股通创新药ETF嘉实',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=87213607433546&marketType=4&marketCode=30&lotSize=100&spreadCode=102&underlyingStockId=0&instrumentType=4&subInstrumentType=4002&_=1776486566141',
    quoteToken: '0478ae9a89'
  },
  {
    name: '证券 ETF 易方达',
    url: '/quote-api/quote-v2/get-stock-quote?stockId=74680892855418&marketType=4&marketCode=30&lotSize=100&spreadCode=102&underlyingStockId=0&instrumentType=4&subInstrumentType=4002&_=1773921808260',
    quoteToken: 'e46a844687'
  }
];
function fetchStockQuote(stock, extraHeaders = {}) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.futunn.com',
      path: stock.url,
      method: 'GET',
      headers: Object.assign({
        accept: 'application/json, text/plain, */*',
        'quote-token': stock.quoteToken,
        'user-agent': 'node-fetch-stock/1.0'
      }, extraHeaders)
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data || '{}');
          if (jsonData && jsonData.code === 0 && jsonData.data) {
            const d = jsonData.data;
            resolve({
              success: true,
              name: d.underlyingStockInfo?.name || stock.name,
              currentPrice: d.price ?? null,
              change: d.change ?? null,
              changeRatio: d.changeRatio ?? null
            });
          } else {
            resolve({ success: false, name: stock.name, error: jsonData.message || `code: ${jsonData.code}` });
          }
        } catch (err) {
          resolve({ success: false, name: stock.name, error: err.message });
        }
      });
    });

    req.on('error', (err) => resolve({ success: false, name: stock.name, error: err.message }));
    req.end();
  });
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  name: 'get_stock_quotes',
  description: '获取预定义股票的行情信息',
  parameters: [],
  async execute(params) {
    const results = [];
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      if (i > 0) {
        await sleep(5000 + Math.random() * 1000);
      }
      const result = await fetchStockQuote(stock);
      results.push(result);
    }
 
    return { success: true, results };
  }
};