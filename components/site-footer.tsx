"use client";
import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import HalftoneWordmarkFooter, { type FooterColumn } from "@/components/ui/halftone-wordmark-footer";
import { anton } from "@/app/fonts";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { useAgentBuild } from "@/components/agent-build/BuildProvider";

const socialNames: Record<string, string> = { X: "X / Twitter" };

function useDotGap() { const [gap,setGap]=useState(6); useEffect(()=>{ const update=()=>setGap(innerWidth<640?4:innerWidth<1100?5:6); update(); addEventListener("resize",update); return()=>removeEventListener("resize",update);},[]); return gap; }
function IstClock() { const [time,setTime]=useState(""); useEffect(()=>{const update=()=>setTime(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Kolkata"}).format(new Date()));update();const id=setInterval(update,30000);return()=>clearInterval(id);},[]); return <span className="hwf-clock" data-layer="text" data-kind="footer-ist"><i aria-hidden="true" />IST <time>{time || "--:--"}</time></span>; }

/** `base` is "/" on other pages, so its links lead back to the home page's sections. */
export function SiteFooter({ base = "" }: { base?: string }) {
  const { motionEnabled } = useMotionPreference(); const { replayBuild, scrollToTop, buildWillRun } = useAgentBuild(); const gap = useDotGap();
  const backToTop = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    scrollToTop();
    // The jump would have moved keyboard focus to the top, so this does too.
    document.querySelector<HTMLElement>(".nav-logo")?.focus({ preventScroll: true });
  };
  const { identity, hero, contact, navigation, work } = portfolioContent; const email = contact.email;
  const projects = work.projects.map((project)=>{ const href = project.liveHref || project.githubHref; return { label:project.title, href, external:href.startsWith("http") }; });
  const columns: FooterColumn[] = [
    { title:"Navigate", links:[...navigation.map((item)=>({ label:item.label, href:`${base}${item.href}` })), { label:"Engineering notes", href:"/notes" }] },
    { title:"Selected work", links:projects },
    { title:"Connect", links:[...contact.socials.map(item=>({ label:socialNames[item.label] ?? item.label, href:item.href, external:true })), ...(email ? [{ label:"Email me", href:`mailto:${email}` }] : [])] }
  ];

  const brandExtra = <>
    <p className="hwf-roles" data-layer="text" data-kind="footer-roles">{identity.roles.join(" · ")}</p>
    <span className="hwf-status" data-layer="text" data-kind="footer-status"><i aria-hidden="true" />{hero.availability} · {hero.nextAvailability}</span>
  </>;
  const ruleStart = <>
    <span className="hwf-meta" data-layer="text" data-kind="footer-meta">{`© ${new Date().getFullYear()} ${identity.name} · ${contact.location}`}</span>
    <IstClock/>
    {!base && motionEnabled && <button type="button" className="hwf-replay" onClick={replayBuild} data-magnetic data-magnetic-variant="outline" data-layer="button" data-kind="footer-replay"><span className="hwf-replay-play" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3 1.5v9l7.5-4.5z" /></svg></span><span className="hwf-replay-label">Replay build</span></button>}
  </>;

  return <div id="footer" className="halftone-footer-wrap"><div className="halftone-footer-glow" aria-hidden="true"/><HalftoneWordmarkFooter
    wordmark={identity.displayName}
    label={identity.name}
    logo={<Image className="hwf-logo" src="/logo-mark.png" alt="" width={128} height={128} data-layer="image" data-kind="footer-logo" />}
    brandExtra={brandExtra}
    columns={columns}
    ruleStart={ruleStart}
    onBackToTop={backToTop}
    palette={{ background:"transparent", ink:"#E5322D", warm:"#F7F7F8", text:"#C9C9D2" }}
    fontFamily={`${anton.style.fontFamily}, Anton, Impact, sans-serif`}
    fontWeight={400}
    monoFamily="var(--font-body), system-ui, sans-serif"
    dotGap={gap}
    radius={80}
    crop={.2}
    grain={.5}
    interactive={motionEnabled}
    animate={motionEnabled}
    reveal={buildWillRun ? 0 : 1}
  /></div>;
}
