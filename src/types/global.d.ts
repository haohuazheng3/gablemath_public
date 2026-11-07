export {};

declare global {
  interface Window {
    __gmReportError?: (payload: { name: string; message: string; stack?: string; kind: string }) => void;
    __gmConsentRegion?: "opt-in" | "opt-out";
  }
}
