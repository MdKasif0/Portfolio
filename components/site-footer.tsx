"use client";
import { useEffect, useState } from "react";
import HalftoneWordmarkFooter, { type FooterColumn } from "@/components/ui/halftone-wordmark-footer";
import { anton } from "@/app/fonts";
import { portfolioContent } from "@/data/content";
import { useMotionPreference } from "@/components/motion-shell";
import { useAgentBuild } from "@/components/agent-build/BuildProvider";
import { ContactIcon } from "@/components/contact-footer";

function useDotGap() { const [gap,setGap]=useState(6); useEffect(()=>{ const update=()=>setGap(innerWidth<640?4:innerWidth<1100?5:6); update(); addEventListener("resize",update); return()=>removeEventListener("resize",update);},[]); return gap; }
function IstClock() { const [time,setTime]=useState(""); useEffect(()=>{const update=()=>setTime(new Intl.DateTimeFormat("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false,timeZone:"Asia/Kolkata"}).format(new Date()));update();const id=setInterval(update,30000);return()=>clearInterval(id);},[]); return <span className="hwf-clock" data-layer="text" data-kind="footer-ist">{time ? `IST ${time}` : ""}</span>; }
export function SiteFooter() {
  const { motionEnabled } = useMotionPreference(); const { replayBuild, buildWillRun } = useAgentBuild(); const gap = useDotGap(); const email = portfolioContent.contact.email;
  const projects = portfolioContent.work.projects.slice(0,5).map((project,index)=>({label:project.title,href:project.liveHref || project.githubHref || project.href || (index===0 ? "https://gitroasted.netlify.app" : "#work")}));
  const columns: FooterColumn[] = [{title:"Navigate",links:portfolioContent.navigation.map(item=>({label:item.label,href:item.href}))},{title:"Projects",links:projects},{title:"Connect",links:[...portfolioContent.contact.socials.map(item=>({label:item.label === "SUPPORT" ? "Buy Me a Coffee" : `${item.label} ${item.value}`,href:item.href})),...(email?[{label:email,href:`mailto:${email}`}]:[])]}];
  useEffect(()=>{ const root=document.querySelector<HTMLElement>(".hwf"); if (!root) return; root.dispatchEvent(new CustomEvent("hwf:reveal",{detail:buildWillRun?0:1})); },[buildWillRun]);
  return <div id="footer" className="halftone-footer-wrap" data-cursor-zone="ring"><div className="halftone-footer-glow" aria-hidden="true"/><span className="sr-only" style={{fontFamily:anton.style.fontFamily}}>KASIF</span><HalftoneWordmarkFooter wordmark="KASIF" label={portfolioContent.identity.name} meta={`©${new Date().getFullYear()} · India`} columns={columns} palette={{background:"transparent",ink:"#E5322D",warm:"#F7F7F8",text:"#C9C9D2",accent:"#F2503E"}} fontFamily={`${anton.style.fontFamily}, Anton, Impact, sans-serif`} fontWeight={400} monoFamily="var(--font-body), system-ui, sans-serif" dotGap={gap} radius={96} crop={.18} grain={.55} interactive={motionEnabled} animate={motionEnabled} reveal={buildWillRun?0:1} height="clamp(540px,58vw,900px)" brandExtra={<nav className="hwf-socials" aria-label="Footer social links">{portfolioContent.footer.socialLinks.filter(item=>item.icon!=="email"||email).map(item=><a data-magnetic data-magnetic-variant="outline" data-layer="button" data-kind="footer-social" key={item.label} href={item.href || `mailto:${email}`} aria-label={item.label} target={item.href?"_blank":undefined} rel={item.href?"noreferrer":undefined}><ContactIcon name={item.icon}/></a>)}</nav>} rule={<div className="hwf-rule-slot"><button type="button" onClick={replayBuild} data-magnetic data-magnetic-variant="outline" data-layer="button" data-kind="footer-replay">Replay build ▶</button><IstClock/></div>}/></div>;
}
