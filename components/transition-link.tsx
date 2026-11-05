"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import { canMorph, morphTo } from "@/lib/view-transition";

/** A normal link that plays the morph into a case study when it can. Opening in a new tab still works. */
export function TransitionLink({ href, onClick, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !canMorph()) return;
    event.preventDefault();
    morphTo(event.currentTarget, () => router.push(href));
  };
  return <Link href={href} onClick={go} {...rest} />;
}
