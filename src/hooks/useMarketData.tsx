import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  MarketInstrument,
  UserMarketHolding,
  MarketQuote,
  MarketStatus,
  SearchInstrumentResult,
} from '../services/marketData/types';
import { marketDataProvider } from '../services/marketData';
import {
  loadMarketInstruments,
  saveMarketInstruments,
  loadMarketHoldings,
  saveMarketHoldings,
  sanitizeProfileId,
} from '../utils/storage';
import { redactSecrets } from '../utils/security';

export interface CombinedMarketItem {
  instrument: MarketInstrument;
  holding: UserMarketHolding;
  quote?: MarketQuote;
  currentValueTomans: number;
  totalCostTomans?: number;
  profitTomans?: number;
  profitPercent?: number;
}

export interface MarketDataContextType {
  instruments: MarketInstrument[];
  holdings: UserMarketHolding[];
  quotes: Record<string, MarketQuote>;
  marketStatus: MarketStatus | null;
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: number;
  combinedItems: CombinedMarketItem[];
  totalMarketValueTomans: number;
  totalGoldMarketValueTomans: number;
  totalMarketCostTomans: number;
  addInstrumentAndHolding: (
    searchResult: SearchInstrumentResult,
    quantity: number,
    averageBuyPriceTomans?: number
  ) => void;
  addUnitsToGoldInstrument: (
    symbol: string,
    unitsToAdd: number,
    priceTomans?: number
  ) => void;
  updateHolding: (
    holdingId: string,
    quantity: number,
    averageBuyPriceTomans?: number
  ) => void;
  removeHolding: (holdingId: string) => void;
  refreshQuotes: (isManual?: boolean) => Promise<void>;
  hydrateMarketDataFromProfile: (
    profileId: string | null,
    profileInstruments?: MarketInstrument[],
    profileHoldings?: UserMarketHolding[]
  ) => void;
}

const MarketDataContext = createContext<MarketDataContextType | null>(null);

function normalizeMarketInstruments(raw: MarketInstrument[]): MarketInstrument[] {
  return (raw || []).map((inst) => {
    if (inst.symbol === 'عیار' && inst.providerInstrumentId !== '34144395039913458') {
      return {
        ...inst,
        providerInstrumentId: '34144395039913458',
        name: 'صندوق س. پشتوانه طلای لوتوس',
      };
    }
    return { ...inst };
  });
}

export interface MarketDataProviderProps {
  children: React.ReactNode;
  activeProfileId?: string | null;
  onPersistProfileMarketData?: (
    instruments: MarketInstrument[],
    holdings: UserMarketHolding[],
    profileId: string
  ) => void;
}

export const MarketDataProvider: React.FC<MarketDataProviderProps> = ({
  children,
  activeProfileId = null,
  onPersistProfileMarketData,
}) => {
  const cleanProfileId = sanitizeProfileId(activeProfileId);
  const hydratedKeyRef = useRef<string>(cleanProfileId || '__default__');
  const activeProfileRef = useRef<string | null>(cleanProfileId);
  const fetchGenRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);

  const [instruments, setInstruments] = useState<MarketInstrument[]>(() =>
    normalizeMarketInstruments(loadMarketInstruments(cleanProfileId))
  );
  const [holdings, setHoldings] = useState<UserMarketHolding[]>(() =>
    loadMarketHoldings(cleanProfileId).map((h) => ({ ...h }))
  );
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());

  const instrumentsRef = useRef<MarketInstrument[]>(instruments);
  const holdingsRef = useRef<UserMarketHolding[]>(holdings);
  instrumentsRef.current = instruments;
  holdingsRef.current = holdings;

  // Synchronously isolate & re-hydrate market instruments/holdings whenever activeProfileId switches
  useEffect(() => {
    const nextKey = cleanProfileId || '__default__';
    if (hydratedKeyRef.current !== nextKey) {
      abortRef.current?.abort();
      abortRef.current = null;
      fetchGenRef.current += 1;
      isFetchingRef.current = false;
      activeProfileRef.current = cleanProfileId;

      const loadedInstruments = normalizeMarketInstruments(loadMarketInstruments(cleanProfileId));
      const loadedHoldings = loadMarketHoldings(cleanProfileId).map((h) => ({ ...h }));

      hydratedKeyRef.current = nextKey;
      instrumentsRef.current = loadedInstruments;
      holdingsRef.current = loadedHoldings;

      setInstruments(loadedInstruments);
      setHoldings(loadedHoldings);
      setQuotes({});
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [cleanProfileId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const hydrateMarketDataFromProfile = useCallback(
    (
      profileId: string | null,
      profileInstruments?: MarketInstrument[],
      profileHoldings?: UserMarketHolding[]
    ) => {
      const cleanId = sanitizeProfileId(profileId);
      const nextKey = cleanId || '__default__';
      abortRef.current?.abort();
      abortRef.current = null;
      fetchGenRef.current += 1;
      isFetchingRef.current = false;
      activeProfileRef.current = cleanId;

      const resolvedInstruments = normalizeMarketInstruments(
        Array.isArray(profileInstruments) ? profileInstruments : loadMarketInstruments(cleanId)
      );
      const resolvedHoldings = (
        Array.isArray(profileHoldings) ? profileHoldings : loadMarketHoldings(cleanId)
      ).map((h) => ({ ...h }));

      hydratedKeyRef.current = nextKey;
      instrumentsRef.current = resolvedInstruments;
      holdingsRef.current = resolvedHoldings;

      saveMarketInstruments(resolvedInstruments, cleanId);
      saveMarketHoldings(resolvedHoldings, cleanId);

      setInstruments(resolvedInstruments);
      setHoldings(resolvedHoldings);
      setQuotes({});
      setIsLoading(false);
      setIsRefreshing(false);
    },
    []
  );

  // Persist instruments & holdings strictly under the hydrated active profile
  useEffect(() => {
    const currentKey = cleanProfileId || '__default__';
    if (hydratedKeyRef.current !== currentKey) return;
    saveMarketInstruments(instruments, cleanProfileId);
    if (cleanProfileId && onPersistProfileMarketData) {
      onPersistProfileMarketData(instruments, holdingsRef.current, cleanProfileId);
    }
  }, [instruments, cleanProfileId, onPersistProfileMarketData]);

  useEffect(() => {
    const currentKey = cleanProfileId || '__default__';
    if (hydratedKeyRef.current !== currentKey) return;
    saveMarketHoldings(holdings, cleanProfileId);
    if (cleanProfileId && onPersistProfileMarketData) {
      onPersistProfileMarketData(instrumentsRef.current, holdings, cleanProfileId);
    }
  }, [holdings, cleanProfileId, onPersistProfileMarketData]);

  // Fetch Quotes and Market Status with AbortController + profile-generation guard
  const refreshQuotes = useCallback(async (isManual = false) => {
    if (isFetchingRef.current && !isManual) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const gen = ++fetchGenRef.current;
    const startedProfileKey = hydratedKeyRef.current;
    const snapshotInstruments = instrumentsRef.current;

    isFetchingRef.current = true;
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const status = await marketDataProvider.getMarketStatus();
      if (controller.signal.aborted || gen !== fetchGenRef.current || hydratedKeyRef.current !== startedProfileKey) {
        return;
      }
      setMarketStatus(status);

      if (snapshotInstruments.length > 0) {
        const provider = marketDataProvider as unknown as {
          getQuotes: (insts: MarketInstrument[], signal?: AbortSignal) => Promise<Record<string, MarketQuote>>;
        };
        const newQuotes = await provider.getQuotes(snapshotInstruments, controller.signal);
        if (controller.signal.aborted || gen !== fetchGenRef.current || hydratedKeyRef.current !== startedProfileKey) {
          return;
        }
        setQuotes((prev) => ({ ...prev, ...newQuotes }));
      }

      setLastRefreshedAt(Date.now());
    } catch (error) {
      if ((error as { name?: string })?.name !== 'AbortError') {
        console.warn('[MarketDataHook] Refresh error:', redactSecrets(error));
      }
    } finally {
      if (gen === fetchGenRef.current) {
        isFetchingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  // Auto-refresh when instrument list changes or profile switches
  useEffect(() => {
    if (instruments.length > 0) {
      void refreshQuotes(false);
    }
  }, [instruments.length, cleanProfileId, refreshQuotes]);

  // Polling every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (instrumentsRef.current.length > 0) {
        void refreshQuotes(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshQuotes]);

  // Add a new Instrument and its initial user holding
  const addInstrumentAndHolding = useCallback(
    (
      searchResult: SearchInstrumentResult,
      quantity: number,
      averageBuyPriceTomans?: number
    ) => {
      const now = new Date().toISOString();
      const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
      const safeAvg =
        averageBuyPriceTomans && Number.isFinite(averageBuyPriceTomans) && averageBuyPriceTomans > 0
          ? averageBuyPriceTomans
          : undefined;

      const existingInst = instrumentsRef.current.find(
        (i) => i.providerInstrumentId === searchResult.insCode
      );
      const instrumentId = existingInst
        ? existingInst.id
        : `inst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      if (!existingInst) {
        const newInst: MarketInstrument = {
          id: instrumentId,
          provider: 'tsetmc',
          providerInstrumentId: searchResult.insCode,
          symbol: searchResult.symbol,
          name: searchResult.name,
          assetType: searchResult.assetType,
          createdAt: now,
          updatedAt: now,
        };
        setInstruments((prev) => [...prev, newInst]);
      }

      const existingHolding = holdingsRef.current.find((h) => h.instrumentId === instrumentId);

      if (existingHolding) {
        setHoldings((prev) =>
          prev.map((h) =>
            h.id === existingHolding.id
              ? {
                  ...h,
                  quantity: h.quantity + safeQty,
                  averageBuyPriceTomans: safeAvg ?? h.averageBuyPriceTomans,
                  updatedAt: now,
                }
              : h
          )
        );
      } else {
        const newHolding: UserMarketHolding = {
          id: `hold_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          instrumentId,
          quantity: safeQty,
          averageBuyPriceTomans: safeAvg,
          createdAt: now,
          updatedAt: now,
        };
        setHoldings((prev) => [...prev, newHolding]);
      }
    },
    []
  );

  // Add units directly to an existing or default gold instrument
  const addUnitsToGoldInstrument = useCallback(
    (symbol: string, unitsToAdd: number, priceTomans?: number) => {
      if (!Number.isFinite(unitsToAdd) || unitsToAdd <= 0) return;
      const now = new Date().toISOString();
      const existingInst = instrumentsRef.current.find((i) => i.symbol === symbol);

      if (existingInst) {
        const existingHolding = holdingsRef.current.find(
          (h) => h.instrumentId === existingInst.id
        );
        if (existingHolding) {
          setHoldings((prev) =>
            prev.map((h) =>
              h.id === existingHolding.id
                ? {
                    ...h,
                    quantity: h.quantity + unitsToAdd,
                    updatedAt: now,
                  }
                : h
            )
          );
        } else {
          const newHolding: UserMarketHolding = {
            id: `hold_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            instrumentId: existingInst.id,
            quantity: unitsToAdd,
            averageBuyPriceTomans: priceTomans,
            createdAt: now,
            updatedAt: now,
          };
          setHoldings((prev) => [...prev, newHolding]);
        }
      } else {
        const newInstId = `inst_gold_${Date.now()}`;
        const newInst: MarketInstrument = {
          id: newInstId,
          provider: 'tsetmc',
          providerInstrumentId: symbol === 'عیار' ? '34144395039913458' : '26656708390708948',
          symbol,
          name: symbol === 'عیار' ? 'صندوق س. پشتوانه طلای لوتوس-ت' : `صندوق طلای ${symbol}`,
          assetType: 'etf',
          createdAt: now,
          updatedAt: now,
        };
        const newHolding: UserMarketHolding = {
          id: `hold_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          instrumentId: newInstId,
          quantity: unitsToAdd,
          averageBuyPriceTomans: priceTomans,
          createdAt: now,
          updatedAt: now,
        };
        setInstruments((prev) => [...prev, newInst]);
        setHoldings((prev) => [...prev, newHolding]);
      }
    },
    []
  );

  const updateHolding = useCallback(
    (holdingId: string, quantity: number, averageBuyPriceTomans?: number) => {
      const now = new Date().toISOString();
      const safeQty = Math.max(0, Number.isFinite(quantity) ? quantity : 0);
      setHoldings((prev) =>
        prev.map((h) =>
          h.id === holdingId
            ? {
                ...h,
                quantity: safeQty,
                averageBuyPriceTomans:
                  averageBuyPriceTomans && averageBuyPriceTomans > 0
                    ? averageBuyPriceTomans
                    : undefined,
                updatedAt: now,
              }
            : h
        )
      );
    },
    []
  );

  const removeHolding = useCallback((holdingId: string) => {
    const currentHoldings = holdingsRef.current;
    const holdingToRemove = currentHoldings.find((h) => h.id === holdingId);
    if (!holdingToRemove) return;

    const instId = holdingToRemove.instrumentId;
    setHoldings((prev) => prev.filter((h) => h.id !== holdingId));

    const otherHoldingsWithInst = currentHoldings.filter(
      (h) => h.id !== holdingId && h.instrumentId === instId
    );
    if (otherHoldingsWithInst.length === 0) {
      setInstruments((prev) => prev.filter((i) => i.id !== instId));
    }
  }, []);

  const combinedItems: CombinedMarketItem[] = useMemo(() => {
    return holdings.map((holding) => {
      const instrument = instruments.find((i) => i.id === holding.instrumentId) || {
        id: holding.instrumentId,
        provider: 'tsetmc',
        providerInstrumentId: '',
        symbol: 'نامشخص',
        name: 'ابزار حذف‌شده',
        assetType: 'other',
        createdAt: holding.createdAt,
        updatedAt: holding.updatedAt,
      };

      const quote = quotes[instrument.id];
      const unitPriceTomans = quote?.lastPriceTomans || 0;
      const currentValueTomans = holding.quantity * unitPriceTomans;

      let totalCostTomans: number | undefined;
      let profitTomans: number | undefined;
      let profitPercent: number | undefined;

      if (holding.averageBuyPriceTomans && holding.averageBuyPriceTomans > 0) {
        totalCostTomans = holding.quantity * holding.averageBuyPriceTomans;
        profitTomans = currentValueTomans - totalCostTomans;
        profitPercent = totalCostTomans > 0 ? (profitTomans / totalCostTomans) * 100 : 0;
      }

      return {
        instrument,
        holding,
        quote,
        currentValueTomans,
        totalCostTomans,
        profitTomans,
        profitPercent,
      };
    });
  }, [holdings, instruments, quotes]);

  const totalMarketValueTomans = useMemo(() => {
    return combinedItems.reduce((sum, item) => sum + item.currentValueTomans, 0);
  }, [combinedItems]);

  const totalGoldMarketValueTomans = useMemo(() => {
    return combinedItems
      .filter(
        (item) =>
          item.instrument.assetType === 'etf' ||
          item.instrument.symbol.includes('عیار') ||
          item.instrument.symbol.includes('طلا') ||
          item.instrument.symbol.includes('کهربا') ||
          item.instrument.symbol.includes('زر') ||
          item.instrument.symbol.includes('گوهر') ||
          item.instrument.symbol.includes('زرفام')
      )
      .reduce((sum, item) => sum + item.currentValueTomans, 0);
  }, [combinedItems]);

  const totalMarketCostTomans = useMemo(() => {
    return combinedItems.reduce((sum, item) => sum + (item.totalCostTomans || 0), 0);
  }, [combinedItems]);

  const contextValue = useMemo<MarketDataContextType>(
    () => ({
      instruments,
      holdings,
      quotes,
      marketStatus,
      isLoading,
      isRefreshing,
      lastRefreshedAt,
      combinedItems,
      totalMarketValueTomans,
      totalGoldMarketValueTomans,
      totalMarketCostTomans,
      addInstrumentAndHolding,
      addUnitsToGoldInstrument,
      updateHolding,
      removeHolding,
      refreshQuotes,
      hydrateMarketDataFromProfile,
    }),
    [
      instruments,
      holdings,
      quotes,
      marketStatus,
      isLoading,
      isRefreshing,
      lastRefreshedAt,
      combinedItems,
      totalMarketValueTomans,
      totalGoldMarketValueTomans,
      totalMarketCostTomans,
      addInstrumentAndHolding,
      addUnitsToGoldInstrument,
      updateHolding,
      removeHolding,
      refreshQuotes,
      hydrateMarketDataFromProfile,
    ]
  );

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
};

export function useMarketData(): MarketDataContextType {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within a MarketDataProvider');
  }
  return context;
}
