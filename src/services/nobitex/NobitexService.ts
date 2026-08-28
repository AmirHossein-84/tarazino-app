import { Capacitor } from '@capacitor/core';
import { CryptoAsset } from '../../types/investment';
import { NobitexWallet, NobitexMarketStat, NobitexProfile, NobitexConfig } from './types';
import { signNobitexRequest } from './nobitexSigner';

// Normalize Nobitex English currency names to standard tickers
const NOBITEX_NAME_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'btc',
  btc: 'btc',
  ethereum: 'eth',
  eth: 'eth',
  tether: 'usdt',
  usdt: 'usdt',
  solana: 'sol',
  sol: 'sol',
  ripple: 'xrp',
  xrp: 'xrp',
  binancecoin: 'bnb',
  bnb: 'bnb',
  cardano: 'ada',
  ada: 'ada',
  dogecoin: 'doge',
  doge: 'doge',
  tron: 'trx',
  trx: 'trx',
  polkadot: 'dot',
  dot: 'dot',
  polygon: 'pol',
  pol: 'pol',
  matic: 'pol',
  avalanche: 'avax',
  avax: 'avax',
  chainlink: 'link',
  link: 'link',
  near: 'near',
  sui: 'sui',
  aptos: 'apt',
  apt: 'apt',
  notcoin: 'not',
  not: 'not',
  toncoin: 'ton',
  ton: 'ton',
  shiba: 'shib',
  'shiba inu': 'shib',
  shib: 'shib',
  litecoin: 'ltc',
  ltc: 'ltc',
  uniswap: 'uni',
  uni: 'uni',
  fantom: 'ftm',
  ftm: 'ftm',
  dai: 'dai',
};

// Map popular symbols to Persian labels and colors
const COIN_METADATA: Record<string, { name: string; color: string; targetPercent: number }> = {
  btc: { name: 'بیت‌کوین', color: '#F7931A', targetPercent: 25 },
  eth: { name: 'اتریوم', color: '#627EEA', targetPercent: 25 },
  sol: { name: 'سولانا', color: '#14F195', targetPercent: 20 },
  xrp: { name: 'ریپل', color: '#23292F', targetPercent: 10 },
  bnb: { name: 'بایننس‌کوین', color: '#F3BA2F', targetPercent: 15 },
  ada: { name: 'کاردانو', color: '#0033AD', targetPercent: 10 },
  dot: { name: 'پولکادات', color: '#E6007A', targetPercent: 10 },
  doge: { name: 'دوج‌کوین', color: '#C2A633', targetPercent: 10 },
  trx: { name: 'ترون', color: '#FF0013', targetPercent: 10 },
  pol: { name: 'پالیگان', color: '#8247E5', targetPercent: 10 },
  avax: { name: 'آوالانچ', color: '#E84142', targetPercent: 10 },
  link: { name: 'چین‌لینک', color: '#375BD2', targetPercent: 10 },
  near: { name: 'نیر پروتکل', color: '#00C08B', targetPercent: 10 },
  sui: { name: 'سویی', color: '#2A82E4', targetPercent: 10 },
  apt: { name: 'آپتوس', color: '#2EE5AC', targetPercent: 10 },
  usdt: { name: 'تتر', color: '#26A17B', targetPercent: 10 },
  not: { name: 'نات‌کوین', color: '#EAB308', targetPercent: 10 },
  ton: { name: 'تون‌کوین', color: '#0088CC', targetPercent: 10 },
  shib: { name: 'شیبا اینو', color: '#FFA409', targetPercent: 10 },
};

class NobitexService {
  private readonly CACHE_KEY_BUY_PRICES = 'nobitex_cached_buy_prices_v1';

  private getBaseUrl(): string {
    // In native mobile apps (Capacitor Android / iOS), call direct
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      return 'https://apiv2.nobitex.ir';
    }
    // In web browsers (localhost dev or Vercel production), use same-origin proxy to bypass CORS
    return '/api/nobitex';
  }

  private async getRequestHeaders(params: {
    config: NobitexConfig;
    method: 'GET' | 'POST' | 'DELETE' | 'PUT';
    path: string;
    body?: string;
  }): Promise<Record<string, string>> {
    const { config, method, path, body = '' } = params;

    if (config.authType === 'api_key' && config.publicKey && config.secretKey) {
      return signNobitexRequest({
        publicKey: config.publicKey,
        secretKey: config.secretKey,
        method,
        path,
        body,
      });
    }

    // Token authentication
    const token = config.token || config.publicKey || '';
    return {
      'Authorization': `Token ${token.trim()}`,
      'User-Agent': 'TraderBot/InvestmentApp-1.0.0',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private handleNobitexError(data: any, statusCode?: number): never {
    if (data?.code === 'UnexpectedError') {
      throw new Error(
        'امضای دیجیتال یا کلید نوبیتکس تایید نشد. لطفاً از صحت کلید عمومی (Key) و کلید خصوصی (Secret) اطمینان حاصل فرمایید.'
      );
    }
    if (data?.code === 'KeyNotFound' || statusCode === 401 || statusCode === 403) {
      throw new Error('کلید API یا توکن نوبیتکس نامعتبر است، منقضی شده یا دسترسی READ ندارد.');
    }
    if (data?.code === 'TooManyRequests' || statusCode === 429) {
      throw new Error('محدودیت درخواست‌های نوبیتکس (Rate Limit). لطفاً چند لحظه بعد تلاش کنید.');
    }
    throw new Error(data?.message || `خطا در ارتباط با نوبیتکس: کد ${statusCode || 'نامشخص'}`);
  }

  /**
   * Helper to add a strict timeout to async promises so sync never hangs
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
  }

  /**
   * Load cached average buy prices from localStorage
   */
  private getCachedBuyPrices(): Map<string, number> {
    const map = new Map<string, number>();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.CACHE_KEY_BUY_PRICES);
        if (raw) {
          const parsed = JSON.parse(raw);
          for (const [sym, price] of Object.entries(parsed)) {
            if (typeof price === 'number' && price > 0) {
              map.set(sym.toLowerCase(), price);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[NobitexService] Failed to read buy price cache:', e);
    }
    return map;
  }

  /**
   * Save calculated average buy prices to localStorage
   */
  private saveCachedBuyPrices(priceMap: Map<string, number>): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage && priceMap.size > 0) {
        const obj: Record<string, number> = {};
        priceMap.forEach((price, sym) => {
          if (price > 0) obj[sym.toLowerCase()] = price;
        });
        window.localStorage.setItem(this.CACHE_KEY_BUY_PRICES, JSON.stringify(obj));
      }
    } catch (e) {
      console.warn('[NobitexService] Failed to save buy price cache:', e);
    }
  }

  /**
   * Fetch User Profile to test API Key / Token validity
   */
  async getProfile(config: NobitexConfig): Promise<NobitexProfile> {
    const base = this.getBaseUrl();
    const path = '/users/profile';
    const url = `${base}${path}`;

    const headers = await this.getRequestHeaders({
      config,
      method: 'GET',
      path,
      body: '',
    });

    const res = await fetch(url, {
      method: 'GET',
      headers,
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      // Ignore JSON parse error
    }

    if (!res.ok || data.status === 'failed') {
      this.handleNobitexError(data, res.status);
    }

    return data.profile || data;
  }

  /**
   * Fetch User Wallets List
   */
  async getWallets(config: NobitexConfig): Promise<NobitexWallet[]> {
    const base = this.getBaseUrl();
    const path = '/users/wallets/list';
    const url = `${base}${path}`;

    const headers = await this.getRequestHeaders({
      config,
      method: 'POST',
      path,
      body: '',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers,
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      // Ignore JSON parse error
    }

    if (!res.ok || data.status === 'failed') {
      this.handleNobitexError(data, res.status);
    }

    return data.wallets || [];
  }

  /**
   * Fetch User Trades (History of executed buy/sell orders in last 180 days)
   * Official Doc: https://apidocs.nobitex.ir/spot_trade/فهرست-معاملات-کاربر
   */
  async getUserTrades(config: NobitexConfig): Promise<any[]> {
    const base = this.getBaseUrl();
    const pathWithQuery = '/market/trades/list?pageSize=500';

    try {
      const headers = await this.getRequestHeaders({
        config,
        method: 'GET',
        path: pathWithQuery,
        body: '',
      });

      const res = await fetch(`${base}${pathWithQuery}`, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        return data.trades || data.data || (Array.isArray(data) ? data : []);
      }

      // Fallback: without query string
      const fallbackPath = '/market/trades/list';
      const fallbackHeaders = await this.getRequestHeaders({
        config,
        method: 'GET',
        path: fallbackPath,
        body: '',
      });
      const fallbackRes = await fetch(`${base}${fallbackPath}`, {
        method: 'GET',
        headers: fallbackHeaders,
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return fallbackData.trades || fallbackData.data || (Array.isArray(fallbackData) ? fallbackData : []);
      }
      return [];
    } catch (e) {
      console.warn('[NobitexService] Could not fetch user trades:', e);
      return [];
    }
  }

  /**
   * Fetch User Orders (Orders list fallback)
   * Official Doc: https://apidocs.nobitex.ir/spot_trade/فهرست-سفارش-های-کاربر
   */
  async getUserOrders(config: NobitexConfig): Promise<any[]> {
    const base = this.getBaseUrl();
    const pathWithQuery = '/market/orders/list?status=all';

    try {
      const headers = await this.getRequestHeaders({
        config,
        method: 'GET',
        path: pathWithQuery,
        body: '',
      });

      const res = await fetch(`${base}${pathWithQuery}`, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        return data.orders || data.data || (Array.isArray(data) ? data : []);
      }

      // Fallback: without query string
      const fallbackPath = '/market/orders/list';
      const fallbackHeaders = await this.getRequestHeaders({
        config,
        method: 'GET',
        path: fallbackPath,
        body: '',
      });
      const fallbackRes = await fetch(`${base}${fallbackPath}`, {
        method: 'GET',
        headers: fallbackHeaders,
      });

      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        return fallbackData.orders || fallbackData.data || (Array.isArray(fallbackData) ? fallbackData : []);
      }
      return [];
    } catch (e) {
      console.warn('[NobitexService] Could not fetch user orders:', e);
      return [];
    }
  }

  /**
   * Fetch Portfolio Overall Profit & Loss from Nobitex native portfolio API
   * Official Doc: https://apidocs.nobitex.ir/portfolio/سود-و-زیان-کل-ماه-گذشته
   */
  async getPortfolioTotalProfit(config: NobitexConfig): Promise<{
    totalProfitTomans?: number;
    totalProfitPercent?: number;
  } | null> {
    try {
      const base = this.getBaseUrl();
      const path = '/users/portfolio/last-month-total-profit';
      const headers = await this.getRequestHeaders({
        config,
        method: 'POST',
        path,
        body: '',
      });

      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' && data.data) {
          const rawProfit = parseFloat(data.data.total_profit || '0');
          const rawPct = parseFloat(data.data.total_profit_percentage || '0');
          return {
            totalProfitTomans: Math.round(rawProfit / 10), // Rials to Tomans
            totalProfitPercent: rawPct,
          };
        }
      }
    } catch (e) {
      console.warn('[NobitexService] Native portfolio total profit fetch failed:', e);
    }
    return null;
  }

  /**
   * Fetch Market Stats (Latest Prices in Rials/Tomans for all pairs)
   */
  async getMarketStats(
    _srcCurrencies?: string[],
    dstCurrency: 'rls' | 'usdt' = 'rls'
  ): Promise<Record<string, NobitexMarketStat>> {
    const base = this.getBaseUrl();
    const url = `${base}/market/stats?dstCurrency=${dstCurrency}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'TraderBot/InvestmentApp-1.0.0',
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`خطا در دریافت نرخ‌های بازار نوبیتکس: کد ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'failed') {
      throw new Error(data.message || 'خطا در دریافت آمار بازار نوبیتکس');
    }

    return data.stats || {};
  }

  /**
   * Robust Market Symbol Parser
   * Extracts clean source ticker ('btc', 'eth', 'usdt', etc.) and destination ('rls', 'usdt', 'irt')
   */
  private extractMarketSymbols(item: any): { src: string; dst: 'rls' | 'usdt' | 'irt' } {
    // 1. From item.market (e.g. "BTC-RLS", "ETH-USDT", "USDT-RLS", "BTC_IRT")
    if (item.market && typeof item.market === 'string') {
      const parts = item.market.toLowerCase().split(/[-_]/);
      if (parts.length >= 2) {
        const rawSrc = parts[0];
        const rawDst = parts[1];
        const src = NOBITEX_NAME_TO_SYMBOL[rawSrc] || rawSrc;
        let dst: 'rls' | 'usdt' | 'irt' = 'rls';
        if (rawDst === 'usdt' || rawDst === 'tether') dst = 'usdt';
        else if (rawDst === 'irt' || rawDst === 'toman') dst = 'irt';
        return { src, dst };
      }
    }

    // 2. From item.symbol (e.g. "BTCIRT", "BTCUSDT", "BTCRLS")
    if (item.symbol && typeof item.symbol === 'string') {
      const clean = item.symbol.toLowerCase().trim().replace(/[-_]/g, '');
      if (clean.endsWith('irt')) {
        const raw = clean.slice(0, -3);
        return { src: NOBITEX_NAME_TO_SYMBOL[raw] || raw, dst: 'irt' };
      }
      if (clean.endsWith('usdt')) {
        const raw = clean.slice(0, -4);
        return { src: NOBITEX_NAME_TO_SYMBOL[raw] || raw, dst: 'usdt' };
      }
      if (clean.endsWith('rls')) {
        const raw = clean.slice(0, -3);
        return { src: NOBITEX_NAME_TO_SYMBOL[raw] || raw, dst: 'rls' };
      }
    }

    // 3. From item.srcCurrency and item.dstCurrency
    const rawSrc = (item.srcCurrency || '').toLowerCase().trim();
    const rawDst = (item.dstCurrency || '').toLowerCase().trim();
    const src = NOBITEX_NAME_TO_SYMBOL[rawSrc] || rawSrc;

    let dst: 'rls' | 'usdt' | 'irt' = 'rls';
    if (rawDst === 'usdt' || rawDst === 'tether') {
      dst = 'usdt';
    } else if (rawDst === 'irt' || rawDst === 'تومان' || rawDst === 'toman') {
      dst = 'irt';
    } else if (rawDst === '﷼' || rawDst === 'rls' || rawDst === 'rial') {
      dst = 'rls';
    }

    return { src, dst };
  }

  /**
   * Fast Background Trades Processor:
   * Computes weighted average buy price per symbol from trades & orders
   */
  private async fetchAndComputeBuyPrices(
    config: NobitexConfig,
    usdtPriceTomans: number
  ): Promise<{ priceMap: Map<string, number>; tradesCount: number }> {
    const avgBuyPriceMap = new Map<string, number>();
    const buyStatsBySymbol: Record<string, { totalAmount: number; totalCostTomans: number }> = {};
    let totalParsedTrades = 0;

    try {
      const [trades, orders] = await Promise.all([
        this.withTimeout(this.getUserTrades(config), 3000, []),
        this.withTimeout(this.getUserOrders(config), 3000, []),
      ]);

      // 1. Process Trades
      if (trades && Array.isArray(trades)) {
        for (const trade of trades) {
          const isBuy = trade.type === 'buy' || trade.side === 'buy';
          if (!isBuy) continue;

          const { src, dst } = this.extractMarketSymbols(trade);
          if (!src) continue;

          const amount = parseFloat(trade.amount || trade.matchedAmount || '0');
          let rawPrice = parseFloat(trade.price || '0');

          if (rawPrice <= 0 && trade.total && amount > 0) {
            rawPrice = parseFloat(trade.total) / amount;
          }

          if (amount > 0 && rawPrice > 0) {
            let priceTomans = rawPrice;
            if (dst === 'rls') {
              priceTomans = rawPrice / 10;
            } else if (dst === 'usdt') {
              priceTomans = rawPrice * usdtPriceTomans;
            }

            if (!buyStatsBySymbol[src]) {
              buyStatsBySymbol[src] = { totalAmount: 0, totalCostTomans: 0 };
            }
            buyStatsBySymbol[src].totalAmount += amount;
            buyStatsBySymbol[src].totalCostTomans += amount * priceTomans;
            totalParsedTrades++;
          }
        }
      }

      // 2. Process Orders (as supplementary fallback)
      if (orders && Array.isArray(orders)) {
        for (const order of orders) {
          const isBuy = order.type === 'buy' || order.side === 'buy';
          const isExecuted = order.status === 'Done' || parseFloat(order.matchedAmount || '0') > 0;
          if (!isBuy || !isExecuted) continue;

          const { src, dst } = this.extractMarketSymbols(order);
          if (!src) continue;

          if (buyStatsBySymbol[src] && buyStatsBySymbol[src].totalAmount > 0) {
            continue;
          }

          const matchedAmount = parseFloat(order.matchedAmount || order.amount || '0');
          let rawPrice = parseFloat(order.averagePrice || order.price || '0');

          if (rawPrice <= 0 && order.totalPrice && matchedAmount > 0) {
            rawPrice = parseFloat(order.totalPrice) / matchedAmount;
          }

          if (matchedAmount > 0 && rawPrice > 0) {
            let priceTomans = rawPrice;
            if (dst === 'rls') {
              priceTomans = rawPrice / 10;
            } else if (dst === 'usdt') {
              priceTomans = rawPrice * usdtPriceTomans;
            }

            if (!buyStatsBySymbol[src]) {
              buyStatsBySymbol[src] = { totalAmount: 0, totalCostTomans: 0 };
            }
            buyStatsBySymbol[src].totalAmount += matchedAmount;
            buyStatsBySymbol[src].totalCostTomans += matchedAmount * priceTomans;
            totalParsedTrades++;
          }
        }
      }

      // Calculate weighted averages
      for (const [sym, data] of Object.entries(buyStatsBySymbol)) {
        if (data.totalAmount > 0) {
          const avgTomans = Math.round(data.totalCostTomans / data.totalAmount);
          avgBuyPriceMap.set(sym, avgTomans);
        }
      }

      if (avgBuyPriceMap.size > 0) {
        this.saveCachedBuyPrices(avgBuyPriceMap);
      }
    } catch (e) {
      console.warn('[NobitexService] Error computing buy prices:', e);
    }

    return { priceMap: avgBuyPriceMap, tradesCount: totalParsedTrades };
  }

  /**
   * Ultra-Fast Synchronizer:
   * 1. Pulls user's wallets & real-time prices in parallel (< 400ms)
   * 2. Uses cached buy prices instantly for 0ms lag
   * 3. Refreshes trade history concurrently with strict timeout
   * 4. Maps to CryptoAsset objects with accurate coin quantity, valuation and profit/loss
   */
  async syncUserCryptoHoldings(
    config: NobitexConfig,
    existingAssets: CryptoAsset[]
  ): Promise<{
    updatedAssets: CryptoAsset[];
    syncedCount: number;
    tradesCount: number;
    tomanBalance: number;
    profile?: NobitexProfile;
  }> {
    // 1. Fetch Wallets & Live Market Prices in single ultra-fast parallel batch
    const [wallets, stats] = await Promise.all([
      this.getWallets(config),
      this.getMarketStats(undefined, 'rls'),
    ]);

    // Live Tether price in Tomans
    const usdtPriceRials = stats['usdt-rls']?.latest ? parseFloat(stats['usdt-rls'].latest) : 930000;
    const usdtPriceTomans = Math.round(usdtPriceRials / 10);

    // 2. Load cached buy prices immediately for instantaneous calculation
    const cachedBuyPrices = this.getCachedBuyPrices();

    // 3. Fetch trade records in parallel with timeout (won't block UI if cache exists)
    const hasCachedPrices = cachedBuyPrices.size > 0;
    const tradePromise = this.fetchAndComputeBuyPrices(config, usdtPriceTomans);

    let avgBuyPriceMap = cachedBuyPrices;
    let totalParsedTrades = 0;

    if (!hasCachedPrices) {
      // If first time (no cache), wait for trades with short timeout
      const result = await tradePromise;
      if (result.priceMap.size > 0) {
        avgBuyPriceMap = result.priceMap;
        totalParsedTrades = result.tradesCount;
      }
    } else {
      // If cache exists, process fresh trades in background
      tradePromise
        .then((res) => {
          if (res.priceMap.size > 0) {
            console.log('[NobitexService] Background buy prices updated');
          }
        })
        .catch((err) => {
          console.warn('[NobitexService] Background buy prices calculation failed:', err);
        });
    }

    // 4. Extract active crypto balances (exclude zero balances and rls)
    const cryptoWallets = wallets.filter(
      (w) => w.currency.toLowerCase() !== 'rls' && parseFloat(w.balance || '0') > 0
    );

    // Extract Rials wallet (cash on exchange)
    const rlsWallet = wallets.find((w) => w.currency.toLowerCase() === 'rls');
    const tomanBalance = rlsWallet ? Math.round(parseFloat(rlsWallet.balance || '0') / 10) : 0;

    // 5. Update or merge assets with PnL
    const updatedAssets: CryptoAsset[] = [];
    const processedSymbols = new Set<string>();

    // Update existing assets first
    for (const asset of existingAssets) {
      const sym = asset.symbol.toLowerCase();
      processedSymbols.add(sym);

      // Check all wallets (including zero balance) to detect liquidated coins
      const rawWallet = wallets.find((w) => w.currency.toLowerCase() === sym);
      const statKey = `${sym}-rls`;
      const stat = stats[statKey];

      let unitPriceTomans = asset.unitPrice || 0;
      if (stat && stat.latest) {
        unitPriceTomans = Math.round(parseFloat(stat.latest) / 10);
      } else if (sym === 'usdt') {
        unitPriceTomans = usdtPriceTomans;
      }

      // If Nobitex returned wallet list and this coin is in wallet (even 0), sync exact balance
      const coinAmount = rawWallet
        ? parseFloat(rawWallet.balance || '0')
        : (asset.currentAmount || 0);
      const holdingValue = unitPriceTomans > 0 ? Math.round(coinAmount * unitPriceTomans) : (coinAmount > 0 ? asset.currentHoldingValue : 0);

      // Purchase Cost & PnL calculation
      const avgBuyPrice = avgBuyPriceMap.get(sym) || asset.averageBuyPrice || 0;
      const totalCost = avgBuyPrice > 0 && coinAmount > 0 ? Math.round(coinAmount * avgBuyPrice) : asset.totalCostTomans;
      const profitTomans = totalCost !== undefined && totalCost > 0 ? holdingValue - totalCost : undefined;
      const profitPercent = totalCost !== undefined && totalCost > 0 ? ((holdingValue - totalCost) / totalCost) * 100 : undefined;

      updatedAssets.push({
        ...asset,
        currentAmount: coinAmount,
        unitPrice: unitPriceTomans,
        currentHoldingValue: holdingValue,
        averageBuyPrice: avgBuyPrice > 0 ? avgBuyPrice : undefined,
        totalCostTomans: totalCost,
        profitTomans,
        profitPercent,
      });
    }

    // Add newly discovered assets from Nobitex wallets that weren't in user's list
    for (const wallet of cryptoWallets) {
      const sym = wallet.currency.toLowerCase();
      if (processedSymbols.has(sym)) continue;
      processedSymbols.add(sym);

      const statKey = `${sym}-rls`;
      const stat = stats[statKey];

      let unitPriceTomans = 0;
      if (stat && stat.latest) {
        unitPriceTomans = Math.round(parseFloat(stat.latest) / 10);
      } else if (sym === 'usdt') {
        unitPriceTomans = usdtPriceTomans;
      }

      const coinAmount = parseFloat(wallet.balance || '0');
      const holdingValue = unitPriceTomans > 0 ? Math.round(coinAmount * unitPriceTomans) : 0;
      const meta = COIN_METADATA[sym] || {
        name: sym.toUpperCase(),
        color: '#6366F1',
        targetPercent: 10,
      };

      const avgBuyPrice = avgBuyPriceMap.get(sym) || 0;
      const totalCost = avgBuyPrice > 0 && coinAmount > 0 ? Math.round(coinAmount * avgBuyPrice) : undefined;
      const profitTomans = totalCost !== undefined && totalCost > 0 ? holdingValue - totalCost : undefined;
      const profitPercent = totalCost !== undefined && totalCost > 0 ? ((holdingValue - totalCost) / totalCost) * 100 : undefined;

      updatedAssets.push({
        id: `nobitex_${sym}`,
        symbol: sym.toUpperCase(),
        name: meta.name,
        targetPercent: meta.targetPercent,
        currentAmount: coinAmount,
        unitPrice: unitPriceTomans,
        currentHoldingValue: holdingValue,
        averageBuyPrice: avgBuyPrice > 0 ? avgBuyPrice : undefined,
        totalCostTomans: totalCost,
        profitTomans,
        profitPercent,
        color: meta.color,
      });
    }

    return {
      updatedAssets,
      syncedCount: cryptoWallets.length,
      tradesCount: totalParsedTrades,
      tomanBalance,
    };
  }
}

export const nobitexService = new NobitexService();
