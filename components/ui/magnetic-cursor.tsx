"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";

type Props = { children: ReactNode; enabled?: boolean; cursorSize?: number; cursorColor?: string; blendMode?: "exclusion"|"normal"; shape?: "circle"|"square"|"rounded-square"; magneticFactor?: number; hoverPadding?: number; lerpAmount?: number; speedMultiplier?: number; maxScaleX?: number; maxScaleY?: number; contrastBoost?: number };
const shapeRadius = (shape: Props["shape"]) => shape === "circle" ? "50%" : shape === "square" ? "0" : "8px";

export function MagneticCursor({ children, enabled = true, cursorSize = 14, cursorColor = "#F7F7F8", blendMode = "exclusion", shape = "circle", magneticFactor = .3, hoverPadding = 10, lerpAmount = .16, speedMultiplier = .015, maxScaleX = .9, maxScaleY = .35 }: Props) {
  const cursor = useRef<HTMLDivElement>(null), ripple = useRef<HTMLSpanElement>(null), state = useRef({ current:{x:-100,y:-100}, target:{x:-100,y:-100}, previous:{x:-100,y:-100}, hovered:null as HTMLElement|null, label:"", variant:"", native:false });
  const [active, setActive] = useState(false);
  const [cursorLabel, setCursorLabel] = useState("");
  useEffect(() => {
    const fine = matchMedia("(hover: hover) and (pointer: fine)"), reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setActive(enabled && fine.matches && !reduce.matches);
    update(); fine.addEventListener("change",update); reduce.addEventListener("change",update); return () => { fine.removeEventListener("change",update); reduce.removeEventListener("change",update); };
  }, [enabled]);
  useEffect(() => {
    if (!active || !cursor.current) return; const el=cursor.current, s=state.current; document.documentElement.classList.add("has-custom-cursor");
    gsap.set(el,{xPercent:-50,yPercent:-50,opacity:0,width:cursorSize,height:cursorSize,borderRadius:shapeRadius(shape),backgroundColor:cursorColor,mixBlendMode:blendMode});
    const isText = (target: Element) => Boolean(target.closest("p,h1,h2,h3,h4,h5,h6,li,blockquote")) && !target.closest("a,button,[data-magnetic],[data-cursor-label]");
    const reset = () => { s.hovered=null;s.label="";s.variant="";setCursorLabel(""); gsap.to(el,{width:cursorSize,height:cursorSize,borderRadius:shapeRadius(shape),backgroundColor:cursorColor,borderWidth:0,scaleX:1,scaleY:1,rotate:0,mixBlendMode:blendMode,duration:.2,overwrite:true}); };
    const over = (event: PointerEvent) => { if(!event.isTrusted) return; const target=event.target instanceof Element?event.target:null;if(!target)return; if(target.closest("input,textarea,select,[contenteditable=true],[data-cursor-native]")){s.native=true;gsap.to(el,{opacity:0,duration:.12});return;} s.native=false; const labelled=target.closest<HTMLElement>("[data-cursor-label]"); const zone=target.closest<HTMLElement>("[data-cursor-zone=ring]"); const magnetic=target.closest<HTMLElement>("[data-magnetic]");
      if(labelled){s.hovered=labelled;s.label=labelled.dataset.cursorLabel||"";setCursorLabel(s.label); gsap.to(el,{width:s.label==="VIEW"?88:80,height:s.label==="VIEW"?88:80,borderRadius:"50%",backgroundColor:"#E5322D",mixBlendMode:"normal",duration:.18,overwrite:true});}
      else if(magnetic){s.hovered=magnetic;s.variant=magnetic.dataset.magneticVariant||"fill"; const r=magnetic.getBoundingClientRect(), pad=Number(magnetic.dataset.magneticPadding||hoverPadding); gsap.to(el,{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width+pad*2,height:r.height+pad*2,borderRadius:getComputedStyle(magnetic).borderRadius,backgroundColor:s.variant==="outline"?"transparent":magnetic.dataset.magneticColor||cursorColor,borderWidth:s.variant==="outline"?1.5:0,borderColor:cursorColor,mixBlendMode:s.variant==="outline"?"normal":blendMode,duration:.18,overwrite:true});}
      else if(zone){s.hovered=zone;s.variant="ring";gsap.to(el,{width:56,height:56,borderRadius:"50%",backgroundColor:"transparent",borderWidth:1.5,borderColor:cursorColor,mixBlendMode:"normal",duration:.18,overwrite:true});}
      else if(isText(target)){s.variant="text";gsap.to(el,{scaleX:.5,scaleY:1.5,duration:.18,overwrite:true});} else reset();
    };
    const move=(event:PointerEvent)=>{if(!event.isTrusted)return; const x=event.clientX,y=event.clientY;s.target={x,y};if(s.native)return;gsap.to(el,{opacity:x>=0&&y>=0&&x<=innerWidth&&y<=innerHeight?1:0,duration:.15,overwrite:true});};
    const out=(event:PointerEvent)=>{if(!event.isTrusted)return; const next=event.relatedTarget instanceof Element?event.relatedTarget:null;if(s.hovered && next && s.hovered.contains(next))return; if(s.hovered){gsap.to(s.hovered,{x:0,y:0,duration:.45,ease:"elastic.out(1,.35)"});} reset();};
    const down=(event:PointerEvent)=>{if(!event.isTrusted||s.native)return;gsap.to(el,{scale:s.label ? .92:.85,duration:.08}); const r=ripple.current;if(r){gsap.set(r,{x:event.clientX,y:event.clientY,scale:0,opacity:.6});gsap.to(r,{scale:1,opacity:0,duration:.45,overwrite:true});}};
    const up=(event:PointerEvent)=>{if(!event.isTrusted)return;gsap.to(el,{scale:1,duration:.15});};
    const tick=()=>{if(s.hovered && (s.label||s.variant==="ring")) return; const cur=s.current,tar=s.target,prev=s.previous;cur.x+=(tar.x-cur.x)*lerpAmount;cur.y+=(tar.y-cur.y)*lerpAmount;const dx=cur.x-prev.x,dy=cur.y-prev.y;prev.x=cur.x;prev.y=cur.y;if(!s.hovered){const v=Math.hypot(dx,dy)*speedMultiplier;gsap.set(el,{x:cur.x,y:cur.y,rotate:Math.atan2(dy,dx)*180/Math.PI,scaleX:1+Math.min(v,maxScaleX),scaleY:1-Math.min(v,maxScaleY)});} else {const r=s.hovered.getBoundingClientRect(),pad=Number(s.hovered.dataset.magneticPadding||hoverPadding);gsap.set(el,{x:r.left+r.width/2,y:r.top+r.height/2,width:r.width+pad*2,height:r.height+pad*2});};};
    const pull=(event:PointerEvent)=>{if(!event.isTrusted||!s.hovered||s.label)return; const r=s.hovered.getBoundingClientRect(),strength=Number(s.hovered.dataset.magneticStrength||magneticFactor);gsap.to(s.hovered,{x:(event.clientX-(r.left+r.width/2))*strength,y:(event.clientY-(r.top+r.height/2))*strength,duration:.35,overwrite:true});};
    document.addEventListener("pointerover",over);document.addEventListener("pointerout",out);document.addEventListener("pointermove",move);document.addEventListener("pointermove",pull);document.addEventListener("pointerdown",down);document.addEventListener("pointerup",up);gsap.ticker.add(tick);
    return()=>{document.documentElement.classList.remove("has-custom-cursor");document.removeEventListener("pointerover",over);document.removeEventListener("pointerout",out);document.removeEventListener("pointermove",move);document.removeEventListener("pointermove",pull);document.removeEventListener("pointerdown",down);document.removeEventListener("pointerup",up);gsap.ticker.remove(tick);};
  },[active,cursorSize,cursorColor,blendMode,shape,magneticFactor,hoverPadding,lerpAmount,speedMultiplier,maxScaleX,maxScaleY]);
  return <>{children}{active&&<><div ref={cursor} className={`magnetic-cursor${cursorLabel ? " has-label" : ""}`} aria-hidden="true"><span className="mc-label">{cursorLabel === "PLAY" ? "▶ PLAY" : cursorLabel === "DRAG" ? "‹ DRAG ›" : cursorLabel}</span><i className="mc-you">YOU</i></div><span ref={ripple} className="mc-ripple" aria-hidden="true"/></>}</>;
}
