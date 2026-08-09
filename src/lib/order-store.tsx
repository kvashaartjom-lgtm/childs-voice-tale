import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { GeneratedBook } from "./api";

export type IllustrationStyleId = "aquarel" | "tekenfilm" | "sprookjesachtig" | "realistisch";

export type AgeBracketId = "0-1" | "1-2" | "2-3" | "3-5" | "5-7" | "7-8";

export interface ShippingAddress {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  email: string;
}

export interface OrderState {
  childName: string;
  ageBracket: AgeBracketId | null;
  photoDataUrl: string | null;
  photoName: string | null;
  guardianConsent: boolean;
  storyMode: "record" | "type";
  storyRecordingSeconds: number;
  storyText: string;
  styleId: IllustrationStyleId | null;
  customStyle: string;
  familyVoiceName: string;
  familyVoiceSeconds: number;
  voiceConsent: boolean;
  voiceSkipped: boolean;
  book: GeneratedBook | null;
  shipping: ShippingAddress;
}

const initialState: OrderState = {
  childName: "",
  ageBracket: null,
  photoDataUrl: null,
  photoName: null,
  guardianConsent: false,
  storyMode: "record",
  storyRecordingSeconds: 0,
  storyText: "",
  styleId: null,
  customStyle: "",
  familyVoiceName: "",
  familyVoiceSeconds: 0,
  voiceConsent: false,
  voiceSkipped: false,
  book: null,
  shipping: { name: "", street: "", postalCode: "", city: "", email: "" },
};

interface OrderContextValue {
  order: OrderState;
  update: (patch: Partial<OrderState>) => void;
  reset: () => void;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<OrderState>(initialState);

  const value = useMemo<OrderContextValue>(
    () => ({
      order,
      update: (patch) => setOrder((prev) => ({ ...prev, ...patch })),
      reset: () => setOrder(initialState),
    }),
    [order],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used within OrderProvider");
  return ctx;
}

export const AGE_BRACKETS: { id: AgeBracketId; label: string; note: string }[] = [
  { id: "0-1", label: "0–1 jaar", note: "Klanken & korte zinnen" },
  { id: "1-2", label: "1–2 jaar", note: "Herhaling en ritme" },
  { id: "2-3", label: "2–3 jaar", note: "Eenvoudige woorden" },
  { id: "3-5", label: "3–5 jaar", note: "Kort verhaal met plot" },
  { id: "5-7", label: "5–7 jaar", note: "Meer avontuur" },
  { id: "7-8", label: "7–8 jaar", note: "Rijkere taal" },
];

export const ILLUSTRATION_STYLES: {
  id: IllustrationStyleId;
  name: string;
  description: string;
}[] = [
  { id: "aquarel", name: "Aquarel", description: "Zachte waterverf, warm en tijdloos" },
  { id: "tekenfilm", name: "Tekenfilm", description: "Vrolijk, kleurrijk en speels" },
  { id: "sprookjesachtig", name: "Sprookjesachtig", description: "Klassiek, gouden randen, magisch" },
  { id: "realistisch", name: "Realistisch", description: "Filmisch en gedetailleerd" },
];
