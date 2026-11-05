import type { Metadata } from "next";
import Link from "next/link";
import { Atmosphere } from "@/components/design-primitives";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page doesn't exist.",
  robots: { index: false, follow: false }
};

export default function NotFound() {
  return (
    <>
      <Atmosphere />
      <SiteNav base="/" />
      <main className="nf" id="top">
        <p className="nf-code">404</p>
        <h1 className="nf-title">This page never shipped<span>.</span></h1>
        <p className="nf-body">The link may be old or mistyped. The rest of the site is very much live.</p>
        <div className="nf-actions">
          <Link className="arch-action is-primary" href="/">Back to the homepage <span aria-hidden="true">→</span></Link>
          <Link className="arch-action" href="/#work">See my work</Link>
        </div>
      </main>
    </>
  );
}
