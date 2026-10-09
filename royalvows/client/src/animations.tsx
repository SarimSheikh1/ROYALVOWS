import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function PageAnimations() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const root = document.getElementById("content");
    if (!root) return;
    const media = gsap.matchMedia(root);
    media.add("(prefers-reduced-motion: no-preference)", (context) => {
      const seen = new WeakSet<Element>();
      const headings = new WeakSet<Element>();
      const working = ["/planning", "/portal", "/login", "/reset", "/verify"].includes(pathname);
      gsap.fromTo(root, { opacity: 0.65 }, { opacity: 1, duration: 0.4, clearProps: "opacity" });
      const progress = document.querySelector(".reading-progress");
      if (progress) gsap.fromTo(progress, { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.25 } });
      const footer = document.querySelector(".footer-brand");
      if (footer) gsap.fromTo(footer, { y: 20, opacity: 0.5 }, { y: 0, opacity: 1, duration: 0.8, clearProps: "transform,opacity", scrollTrigger: { trigger: footer, start: "top 95%", once: true } });
      const footerLinks = document.querySelectorAll(".footer-links > *");
      if (footerLinks.length) gsap.fromTo(footerLinks, { y: 14, opacity: 0.4 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.65, clearProps: "transform,opacity", scrollTrigger: { trigger: ".footer-links", start: "top 95%", once: true } });
      const scan = () => context.add(() => {
        const hero = root.querySelector(".hero-copy");
        if (hero && !seen.has(hero)) {
          seen.add(hero);
          const timeline = gsap.timeline({ delay: sessionStorage.getItem("rv-intro") ? 0.1 : 1.3 });
          timeline.fromTo(hero.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, stagger: 0.14, ease: "power3.out", clearProps: "transform,opacity" });
          const backdrop = root.querySelector(".hero");
          if (backdrop) gsap.fromTo(backdrop, { "--hero-pan": "-12px" }, { "--hero-pan": "12px", ease: "none", scrollTrigger: { trigger: backdrop, start: "top top", end: "bottom top", scrub: 0.8 } });
        }
        const ribbon = root.querySelector(".celebration-ribbon-track");
        if (ribbon && !seen.has(ribbon)) {
          seen.add(ribbon);
          gsap.fromTo(ribbon, { xPercent: 0 }, { xPercent: -18, ease: "none", scrollTrigger: { trigger: ribbon.parentElement, start: "top bottom", end: "bottom top", scrub: 0.7 } });
        }
        if (!working) root.querySelectorAll(".statement h2, .section-heading h2, .split h2, .cta h2, .aerial h2, .brand-promise h2").forEach((heading) => {
          if (headings.has(heading)) return;
          headings.add(heading);
          gsap.fromTo(heading, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.05, ease: "power3.inOut", clearProps: "clipPath", scrollTrigger: { trigger: heading, start: "top 94%", once: true } });
        });
        const targets = root.querySelectorAll(".statement > *, .section-heading, main > h1, main > .eyebrow, .detail-hero > div, .split > div, .cta > *, .aerial > h2, .brand-promise > h2, .venue-card, .collection-grid > article, .promise-grid > article, .media-grid > figure, .auth-page > *, .workspace > h1, .workspace > h2, .kpis > *, .panel, .planning-grid > aside, .steps, .theme-grid, .package-offer");
        targets.forEach((target) => {
          if (seen.has(target)) return;
          seen.add(target);
          const card = target.matches(".venue-card, article");
          const siblings = Array.from(target.parentElement?.children || []);
          gsap.fromTo(target, { y: working ? 8 : card ? 34 : 24, opacity: 0.45 }, {
            y: 0, opacity: 1, duration: working ? 0.35 : 0.9, delay: card ? Math.min(siblings.indexOf(target) % 3, 2) * 0.11 : 0,
            ease: "power2.out", clearProps: "transform,opacity",
            scrollTrigger: { trigger: target, start: "top 94%", once: true },
          });
        });
        if (!working) root.querySelectorAll<HTMLImageElement>(".split > img, .detail-hero > img, .aerial-art > img, .media-grid img").forEach((image) => {
          if (seen.has(image)) return;
          seen.add(image);
          gsap.fromTo(image, { clipPath: "inset(8% 4% 8% 4%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "power3.out", clearProps: "clipPath", scrollTrigger: { trigger: image, start: "top 94%", once: true } });
          gsap.fromTo(image, { objectPosition: "50% 40%" }, { objectPosition: "50% 60%", ease: "none", scrollTrigger: { trigger: image, start: "top bottom", end: "bottom top", scrub: 0.6 } });
        });
        ScrollTrigger.refresh();
      });
      scan();
      // API-loaded venue/collection cards arrive after the first render.
      let frame = 0;
      const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); };
      const observer = new MutationObserver(schedule);
      observer.observe(root, { childList: true, subtree: true });
      root.addEventListener("load", schedule, true);
      return () => { cancelAnimationFrame(frame); observer.disconnect(); root.removeEventListener("load", schedule, true); };
    });
    return () => media.revert();
  }, [pathname]);
  return <div className="reading-progress" aria-hidden="true" />;
}
