import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { notifyNow } from '@/lib/notifications';
import { Action, initialState, reducer } from '@/store/reducer';
import { AppEvent, State } from '@/store/types';

const KEY = 'surplus-vendor-state-v1';

interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  banner: AppEvent | null;
  dismissBanner: () => void;
}

const StoreContext = createContext<Ctx>(null as unknown as Ctx);
const NowContext = createContext<number>(Date.now());

export const useStore = () => useContext(StoreContext);
/** Ticks every second. Only use in components that show live times. */
export const useNow = () => useContext(NowContext);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ ...initialState(Date.now()), hydrated: false }));
  const [now, setNow] = useState(Date.now());
  const [banner, setBanner] = useState<AppEvent | null>(null);

  // Load persisted state once.
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) dispatch({ type: 'HYDRATE', state: JSON.parse(raw) });
        else dispatch({ type: 'HYDRATE', state: initialState(Date.now()) });
      })
      .catch(() => dispatch({ type: 'HYDRATE', state: initialState(Date.now()) }));
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!state.hydrated) return;
    AsyncStorage.setItem(KEY, JSON.stringify({ ...state, events: [] })).catch(() => {});
  }, [state]);

  // One clock drives the countdowns and the simulated NGO and rider lifecycle.
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      dispatch({ type: 'TICK', now: n });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Drain events into the in-app banner and an OS notification.
  useEffect(() => {
    if (!state.events.length) return;
    const last = state.events[state.events.length - 1];
    setBanner(last);
    state.events.forEach((e) => notifyNow(e.title, e.body));
    dispatch({ type: 'CLEAR_EVENTS' });
  }, [state.events]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4500);
    return () => clearTimeout(t);
  }, [banner]);

  const value = useMemo(
    () => ({ state, dispatch, banner, dismissBanner: () => setBanner(null) }),
    [state, banner],
  );

  return (
    <StoreContext.Provider value={value}>
      <NowContext.Provider value={now}>{children}</NowContext.Provider>
    </StoreContext.Provider>
  );
}
