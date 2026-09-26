import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { StoreProvider, useStore } from "./lib/store";
import { PurchasesProvider } from "./lib/purchases";
import "./index.css";

/**
 * Identifies the store customer by the Supabase user id, so an entitlement
 * follows the account onto a new phone rather than being stranded on the
 * device that bought it.
 */
function WithPurchases({ children }: { children: ReactNode }) {
  const { state } = useStore();
  return <PurchasesProvider userId={state.session?.id}>{children}</PurchasesProvider>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <WithPurchases>
        <App />
      </WithPurchases>
    </StoreProvider>
  </StrictMode>,
);
