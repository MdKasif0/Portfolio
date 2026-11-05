import { Anton, Caveat, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

export const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
export const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
export const caveat = Caveat({ subsets: ["latin"], variable: "--font-script", display: "swap" });
/** Only the case studies use it, so it isn't preloaded on the home page. */
export const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap", preload: false });
