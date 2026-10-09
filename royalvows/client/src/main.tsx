import { WeddingMusic } from "./music";
import { SEO } from "./seo";

import React, { useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Monogram, useUser } from "./core";
import {
  Home,
  Palaces,
  Palace,
  Collections,
  Planning,
  Contact,
  Gallery,
  Editorial,
  content,
} from "./public";
const Login = lazy(() =>
  import("./portal").then((m) => ({ default: m.Login })),
);
const Portal = lazy(() =>
  import("./portal").then((m) => ({ default: m.Portal })),
);
const ResetPassword = lazy(() =>
  import("./extras").then((m) => ({ default: m.ResetPassword })),
);
const VerifyEmail = lazy(() =>
  import("./extras").then((m) => ({ default: m.VerifyEmail })),
);
import "./styles.css";
function Header() {
  const [open, setOpen] = useState(false);
  const { data } = useUser();
  return (
    <header>
      <Link className="brand" to="/">
        <Monogram />
        <span>
          ROYALVOWS<small>THE ART OF CELEBRATION</small>
        </span>
      </Link>
      <button
        className="mobile"
        aria-label="Toggle navigation"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "open" : ""} onClick={() => setOpen(false)}>
        <Link to="/palaces">Our palaces</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/gallery">The gallery</Link>
        <Link to="/story">Our story</Link>
        <Link to={data ? "/portal" : "/login"}>
          {data ? "My celebration" : "Sign in"}
        </Link>
        <Link className="outline" to="/planning">
          Plan your wedding <ArrowUpRight size={15} />
        </Link>
      </nav>
    </header>
  );
}
function Footer() {
  return (
    <footer>
      <div className="footer-brand">
        <Monogram />
        <h2>
          Extraordinary beginnings.
          <br />
          Timeless memories.
        </h2>
        <Link className="gold" to="/contact">
          Let's create yours <ArrowUpRight />
        </Link>
      </div>
      <div className="footer-links">
        <p>
          ROYALVOWS
          <br />
          <small>Every Love Story Deserves a Palace.</small>
        </p>
        <Link to="/services">Signature experiences</Link>
        <Link to="/catering">Culinary experience</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </div>
      <div className="fine">
        &copy; {new Date().getFullYear()} RoyalVows &middot; Demo palace
        collection &middot; Contact details await configuration.
      </div>
    </footer>
  );
}
function App() {
  return (
    <BrowserRouter>
      <SEO />
      <a className="skip" href="#content">
        Skip to content
      </a>
      <Header />
      <div id="content">
        <Suspense
          fallback={
            <main className="section page" role="status">
              Preparing your celebration...
            </main>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/palaces" element={<Palaces />} />
            <Route path="/palaces/:id" element={<Palace />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/reset" element={<ResetPassword />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/gallery" element={<Gallery />} />
            {Object.keys(content).map((k) => (
              <Route key={k} path={"/" + k} element={<Editorial kind={k} />} />
            ))}
            <Route
              path="*"
              element={
                <main className="section page">
                  <h1>Page not found.</h1>
                  <Link to="/">Return home</Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </div>
      <Footer />
      <WeddingMusic />
    </BrowserRouter>
  );
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000 } },
});
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
