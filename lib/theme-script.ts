/** Shared by the server layout (the inline script) and lib/theme.ts. */
export type Scheme = "dark" | "light";

export const KEY = "kasif-theme";
export const COLORS: Record<Scheme, string> = { dark: "#05050A", light: "#F3F0EA" };


/** Runs in <head> before the body is parsed. */
export const schemeInitScript = `try{if(localStorage.getItem("${KEY}")==="light"){var r=document.documentElement;r.dataset.scheme="light";r.style.colorScheme="light";var m=document.querySelector('meta[name="theme-color"]');m&&m.setAttribute("content","${COLORS.light}")}}catch(e){}`;

