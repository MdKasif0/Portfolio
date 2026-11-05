import { Anton, Caveat, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

export const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
/** Only the hero's "Hello, I'm" uses it, and at 74 KB it isn't worth holding up the page for. */
export const caveat = Caveat({ subsets: ["latin"], variable: "--font-script", display: "swap", preload: false });
/** Only the case studies use it, so it isn't preloaded on the home page. */
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });
