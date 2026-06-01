import React from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate } from "react-router-dom";
import { ArmyBuilder } from "./components/pillages/ArmyBuilder";
import { GalleryPage } from "./components/pages/GalleryPage";
import { MyListsPage } from "./components/pages/MyListsPage";
import { LoginPage } from "./components/pages/LoginPage";
import { SignupPage } from "./components/pages/SignupPage";
import { Toaster } from "./components/ui/sonner";
import { TranslationProvider, useTranslation } from "./components/pillages/TranslationContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import bgImage from "figma:asset/f0b78e52b6e4cfe5f493c208bfa61d8923dd3eac.png";
import footerBorder from "figma:asset/00a5ea4815409642dbc745fcea10c018b5132138.png";
import { Globe, LogIn, LogOut, BookOpen, User } from "lucide-react";

function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-stone-500" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
        className="bg-[#1c1917]/80 text-stone-300 text-sm border border-white/10 rounded-none px-2 py-1 focus:ring-[#cc6512]/50 focus:border-[#cc6512]/50 outline-none uppercase font-serif tracking-widest cursor-pointer hover:bg-black/60 transition-colors"
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}

function TopNav() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-xs uppercase font-serif tracking-widest px-3 py-1 transition-colors ${
      isActive ? "text-[#cc6512]" : "text-stone-300 hover:text-[#cc6512]"
    }`;

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-3 bg-[#1c1917]/70 px-3 py-2 border border-white/10 backdrop-blur-sm">
      <NavLink to="/" className={linkClass} end>
        Builder
      </NavLink>
      <NavLink to="/gallery" className={linkClass}>
        <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> Galerie</span>
      </NavLink>
      {user && (
        <NavLink to="/my-lists" className={linkClass}>
          <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> Mes listes</span>
        </NavLink>
      )}
      {!loading && (
        user ? (
          <button onClick={handleLogout} className="text-xs uppercase font-serif tracking-widest px-3 py-1 text-stone-300 hover:text-red-400 transition-colors inline-flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5" /> Déconnexion
          </button>
        ) : (
          <Link to="/login" className="text-xs uppercase font-serif tracking-widest px-3 py-1 text-stone-300 hover:text-[#cc6512] transition-colors inline-flex items-center gap-1">
            <LogIn className="w-3.5 h-3.5" /> Connexion
          </Link>
        )
      )}
      <div className="h-4 w-px bg-white/10" />
      <LanguageSelector />
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen text-stone-200 font-sans relative selection:bg-orange-500/30 selection:text-orange-100 overflow-x-hidden flex flex-col">
      <div className="fixed inset-0 z-0 bg-[#141210]">
        <div
          className="absolute inset-0 bg-no-repeat bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
      </div>

      <TopNav />

      <main className="relative z-10 container mx-auto py-10 px-4 flex-1">{children}</main>

      <footer className="relative z-10 bg-[#232221] py-6 mt-20">
        <div className="absolute top-0 left-0 w-full -translate-y-[99%] leading-none pointer-events-none">
          <img src={footerBorder} alt="" className="w-full h-auto object-cover opacity-100" />
        </div>
        <div className="container mx-auto px-4 text-center">
          <p className="text-stone-400 text-sm font-medium opacity-80">
            {t("footerProto")}:{" "}
            <a
              href="https://www.pillagewargame.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-200 transition-colors"
            >
              www.pillagewargame.com
            </a>
          </p>
        </div>
      </footer>

      <Toaster theme="dark" className="font-sans" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TranslationProvider>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<ArmyBuilder />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/my-lists" element={<MyListsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </TranslationProvider>
    </BrowserRouter>
  );
}
