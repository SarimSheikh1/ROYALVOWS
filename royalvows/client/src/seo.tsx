import { useEffect } from "react";
import { useLocation } from "react-router-dom";
const names: Record<string, string> = {
  "/": "Every Love Story Deserves a Palace",
  "/palaces": "Our Palaces",
  "/collections": "Wedding Collections",
  "/gallery": "Grand Gallery",
  "/planning": "Bespoke Wedding Planning",
  "/story": "Our Story",
  "/services": "Signature Experiences",
  "/catering": "Culinary Experience",
  "/contact": "Private Viewings & Contact",
  "/privacy": "Privacy Notice",
  "/terms": "Booking Terms",
  "/portal": "My Royal Celebration",
  "/login": "Sign In",
};
export function SEO() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title =
      names[pathname] ||
      (pathname.startsWith("/palaces/") ? "Palace Details" : "RoyalVows");
    document.title = title + " | RoyalVows";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        title +
          " | Explore RoyalVows wedding palaces and plan a bespoke celebration. Demo venue collection.",
      );
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", document.title);
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
