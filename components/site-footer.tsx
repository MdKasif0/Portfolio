"use client";
import { useEffect, useState } from "react";
import HalftoneWordmarkFooter, { type FooterColumn } from "@/components/ui/halftone-wordmark-footer";
import { anton } from "@/app/fonts";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { useAgentBuild } from "@/components/agent-build/BuildProvider";
import { ContactIcon } from "@/components/contact-footer";

const socialNames: Record<string, string> = { X: "X / Twitter", INSTAGRAM: "Instagram", GITHUB: "GitHub", SUPPORT: "Buy me a coffee" };

function useDotGap() { const [gap,setGap]=useState(6); useEffect(()=>{ const update=()=>setGap(innerWidth<640?4:innerWidth<1100?5:6); update(); addEventListener("resize",update); return()=>removeEventListener("resize",update);},[]); return gap; }
function IstClock() { const [time,setTime]=useState(""); useEffect(()=>{const update=()=>setTime(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Kolkata"}).format(new Date()));update();const id=setInterval(update,30000);return()=>clearInterval(id);},[]); return <span className="hwf-clock" data-layer="text" data-kind="footer-ist"><i aria-hidden="true" />IST <time>{time || "--:--"}</time></span>; }

export function SiteFooter() {
  const { motionEnabled } = useMotionPreference(); const { replayBuild, buildWillRun } = useAgentBuild(); const gap = useDotGap();
  const { identity, hero, contact, navigation, work, footer } = portfolioContent; const email = contact.email;
  const projects = work.projects.slice(0,5).map((project,index)=>{ const href = project.liveHref || project.githubHref || project.href || (index===0 ? "https://gitroasted.netlify.app" : "#work"); return { label:project.title, href, external:href.startsWith("http") }; });
  const columns: FooterColumn[] = [
    { title:"Navigate", links:navigation.map((item,index)=>({ label:item.label, href:item.href, index:String(index+1).padStart(2,"0") })) },
    { title:"Selected work", links:projects },
    { title:"Connect", links:[...contact.socials.map(item=>({ label:socialNames[item.label] ?? item.label, href:item.href, external:true })), ...(email ? [{ label:email, href:`mailto:${email}` }] : [])] }
  ];
  useEffect(()=>{ const root=document.querySelector<HTMLElement>(".hwf"); if (!root) return; root.dispatchEvent(new CustomEvent("hwf:reveal",{detail:buildWillRun?0:1})); },[buildWillRun]);

  const brand = <>
    <a className="hwf-logo" href="#top" data-magnetic data-layer="text" data-kind="footer-logo" aria-label="Kasif, back to top" style={{fontFamily:anton.style.fontFamily}}>{identity.displayName}<span aria-hidden="true">.</span></a>
    <p className="hwf-roles" data-layer="text" data-kind="footer-roles">{identity.roles.map((role)=><span key={role}>{role}</span>)}</p>
    <p className="hwf-status" data-layer="text" data-kind="footer-status"><i aria-hidden="true" />{hero.availability}</p>
    <nav className="hwf-socials" aria-label="Footer social links">{footer.socialLinks.filter(item=>item.icon!=="email"||email).map(item=><a data-magnetic data-magnetic-variant="outline" data-layer="button" data-kind="footer-social" key={item.label} href={item.href || `mailto:${email}`} aria-label={item.label} target={item.href?"_blank":undefined} rel={item.href?"noreferrer":undefined}><ContactIcon name={item.icon}/></a>)}</nav>
  </>;
  const rule = <div className="hwf-rule-slot">
    <span className="hwf-copy" data-layer="text" data-kind="footer-meta">© {new Date().getFullYear()} {identity.name} · {contact.location}</span>
    <IstClock/>
    <button type="button" onClick={replayBuild} data-magnetic data-magnetic-variant="outline" data-layer="button" data-kind="footer-replay">Replay build <span aria-hidden="true">▶</span></button>
  </div>;

  return <div id="footer" className="halftone-footer-wrap"><div className="halftone-footer-glow" aria-hidden="true"/><HalftoneWordmarkFooter wordmark={identity.displayName} columns={columns} palette={{background:"transparent",ink:"#E5322D",warm:"#F7F7F8",text:"#C9C9D2",accent:"#F2503E"}} fontFamily={`${anton.style.fontFamily}, Anton, Impact, sans-serif`} fontWeight={400} monoFamily="var(--font-body), system-ui, sans-serif" dotGap={gap} radius={96} crop={.28} grain={.55} interactive={motionEnabled} animate={motionEnabled} reveal={buildWillRun?0:1} brand={brand} rule={rule}/></div>;
}
