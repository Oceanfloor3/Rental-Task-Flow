import { createContext, useContext, useState } from "react";

interface OverlayCtx {
  overlayOpen: boolean;
  setOverlayOpen: (v: boolean) => void;
}

const OverlayContext = createContext<OverlayCtx>({ overlayOpen: false, setOverlayOpen: () => {} });

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  return (
    <OverlayContext.Provider value={{ overlayOpen, setOverlayOpen }}>
      {children}
    </OverlayContext.Provider>
  );
}

export const useOverlay = () => useContext(OverlayContext);
