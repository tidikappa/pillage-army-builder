import React, { Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { ArmyBuilder } from "./components/pillages/ArmyBuilder";
// Secondary routes are code-split, the main builder stays in the initial bundle.
const GalleryPage = React.lazy(() => import("./components/pages/GalleryPage").then(m => ({ default: m.GalleryPage })));
const MyListsPage = React.lazy(() => import("./components/pages/MyListsPage").then(m => ({ default: m.MyListsPage })));
const LoginPage = React.lazy(() => import("./components/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const SignupPage = React.lazy(() => import("./components/pages/SignupPage").then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = React.lazy(() => import("./components/pages/ForgotPasswordPage").then(m => ({ default: m.ForgotPasswordPage })));
const UpdatePasswordPage = React.lazy(() => import("./components/pages/UpdatePasswordPage").then(m => ({ default: m.UpdatePasswordPage })));
const AdminUsersPage = React.lazy(() => import("./components/pages/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const PublicArmyPage = React.lazy(() => import("./components/pages/PublicArmyPage").then(m => ({ default: m.PublicArmyPage })));
const ComparePage = React.lazy(() => import("./components/pages/ComparePage").then(m => ({ default: m.ComparePage })));
import { Toaster } from "./components/ui/sonner";
import { TranslationProvider, useTranslation } from "./components/pillages/TranslationContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import bgImage from "figma:asset/f0b78e52b6e4cfe5f493c208bfa61d8923dd3eac.avif";
import footerBorder from "figma:asset/00a5ea4815409642dbc745fcea10c018b5132138.png";
import logoImage from "figma:asset/b387a8d09d5ce09a0c5f23a9186ce8121bc6253f.png";
import { Globe, LogIn, LogOut, BookOpen, User, Menu, X, Swords, ShieldAlert } from "lucide-react";

function LanguageSelector({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { language, setLanguage } = useTranslation();
  const isDark = variant === "dark";
  return (
    <div className="flex items-center gap-2">
      <Globe className={`w-4 h-4 ${isDark ? "text-stone-300" : "text-[#232221]"}`} />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
        className={
          isDark
            ? "bg-[#1c1917]/80 text-stone-300 text-sm border border-white/15 rounded-none px-2 py-1 focus:ring-[#cc6512]/50 focus:border-[#cc6512] outline-none uppercase font-serif tracking-widest cursor-pointer hover:bg-black/60 transition-colors"
            : "bg-transparent text-[#232221] text-sm border border-[#232221]/40 rounded-none px-2 py-1 focus:ring-[#cc6512]/50 focus:border-[#cc6512] outline-none uppercase font-serif tracking-widest cursor-pointer hover:border-[#cc6512]/60 transition-colors font-medium"
        }
      >
        <option value="fr">FR</option>
        <option value="en">EN</option>
      </select>
    </div>
  );
}

type NavVariant = "light" | "dark";

const buildPrimaryLinkClass = (variant: NavVariant) =>
  ({ isActive }: { isActive: boolean }) => {
    const base = "text-sm font-serif tracking-wider px-3 py-2 transition-colors";
    if (isActive) return `${base} text-[#cc6512] font-bold`;
    if (variant === "dark") return `${base} text-stone-200 hover:text-[#cc6512] font-medium`;
    return `${base} text-[#232221] hover:text-[#cc6512] font-medium drop-shadow-sm`;
  };

const buildSecondaryLinkClass = (variant: NavVariant) =>
  ({ isActive }: { isActive: boolean }) => {
    const base = "text-xs font-serif tracking-wider px-2 py-1 transition-colors";
    if (isActive) return `${base} text-[#cc6512] font-bold`;
    if (variant === "dark") return `${base} text-stone-200 hover:text-[#cc6512] font-medium`;
    return `${base} text-[#232221] hover:text-[#cc6512] font-medium drop-shadow-sm`;
  };

function PrimaryNavItems({ onItemClick, variant = "light" }: { onItemClick?: () => void; variant?: NavVariant }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const linkClass = buildPrimaryLinkClass(variant);
  return (
    <>
      <NavLink to="/" className={linkClass} end onClick={onItemClick}>
        <span className="inline-flex items-center gap-1">
          <Swords className="w-3.5 h-3.5" /> {t("navBuilder")}
        </span>
      </NavLink>
      <NavLink to="/gallery" className={linkClass} onClick={onItemClick}>
        <span className="inline-flex items-center gap-1">
          <BookOpen className="w-3.5 h-3.5" /> {t("navGallery")}
        </span>
      </NavLink>
      {user && (
        <NavLink to="/my-lists" className={linkClass} onClick={onItemClick}>
          <span className="inline-flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> {t("navMyLists")}
          </span>
        </NavLink>
      )}
    </>
  );
}

function SecondaryNavItems({ onItemClick, variant = "light" }: { onItemClick?: () => void; variant?: NavVariant }) {
  const { user, signOut, loading, isAdmin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const linkClass = buildSecondaryLinkClass(variant);

  const handleLogout = async () => {
    onItemClick?.();
    await signOut();
    navigate("/");
  };

  const buttonBase = "text-xs font-serif tracking-wider px-2 py-1 transition-colors inline-flex items-center gap-1 font-medium";
  const buttonColor = variant === "dark" ? "text-stone-200" : "text-[#232221] drop-shadow-sm";

  return (
    <>
      {isAdmin && (
        <NavLink to="/admin/users" className={linkClass} onClick={onItemClick}>
          <span className="inline-flex items-center gap-1 text-red-500">
            <ShieldAlert className="w-3 h-3" /> Admin
          </span>
        </NavLink>
      )}
      {!loading &&
        (user ? (
          <button
            onClick={handleLogout}
            className={`${buttonBase} ${buttonColor} hover:text-red-500`}
          >
            <LogOut className="w-3 h-3" /> {t("navLogout")}
          </button>
        ) : (
          <Link
            to="/login"
            onClick={onItemClick}
            className={`${buttonBase} ${buttonColor} hover:text-[#cc6512]`}
          >
            <LogIn className="w-3 h-3" /> {t("navLogin")}
          </Link>
        ))}
    </>
  );
}

function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="relative z-30 pt-6 pb-4 sm:pt-8">
      {/* Top-right actions (desktop only): admin, login/logout, language */}
      <div className="hidden md:flex absolute top-4 right-4 z-40 items-center gap-3">
        <SecondaryNavItems />
        <div className="h-4 w-px bg-[#232221]/30" />
        <LanguageSelector />
      </div>

      <div className="container mx-auto px-4">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="relative inline-block">
            <Link to="/" aria-label="Accueil" className="block">
              <img
                src={logoImage}
                alt="Pillage Logo"
                className="w-32 h-32 sm:w-44 sm:h-44 object-contain drop-shadow-lg"
              />
            </Link>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-block bg-[#cc6512]/90 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 border border-[#cc6512]/30 shadow-[0_0_10px_rgba(204,101,18,0.5)] whitespace-nowrap">
              Work in progress
            </span>
          </div>
        </div>

        {/* Desktop primary nav (centered, with fading rules above and below) */}
        <div className="hidden md:block mt-8">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#232221]/50 to-transparent" />
          <nav className="flex items-center justify-center gap-2 flex-wrap py-3">
            <PrimaryNavItems />
          </nav>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#232221]/50 to-transparent" />
        </div>

        {/* Mobile burger trigger (top-right of the header) */}
        <div className="md:hidden absolute top-4 right-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="inline-flex items-center justify-center w-11 h-11 border border-[#232221]/40 text-[#232221] hover:text-[#cc6512] hover:border-[#cc6512]/50 transition-colors bg-white/40 backdrop-blur-sm"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel: everything goes here */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed top-4 right-4 left-4 z-50 bg-[#1c1917]/95 border border-white/10 backdrop-blur-md p-4 flex flex-col gap-1 shadow-2xl">
            <PrimaryNavItems onItemClick={() => setOpen(false)} variant="dark" />
            <div className="h-px bg-white/10 my-2" />
            <SecondaryNavItems onItemClick={() => setOpen(false)} variant="dark" />
            <div className="h-px bg-white/10 my-2" />
            <div className="px-3 py-1">
              <LanguageSelector variant="dark" />
            </div>
          </div>
        </>
      )}
    </header>
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

      <SiteHeader />

      <main className="relative z-10 container mx-auto pb-10 px-4 flex-1">{children}</main>

      <footer className="relative z-10 bg-[#232221] py-6 mt-20">
        <div className="absolute top-0 left-0 w-full -translate-y-[99%] leading-none pointer-events-none">
          <img src={footerBorder} alt="" className="w-full h-auto object-cover opacity-100" />
        </div>
        <div className="container mx-auto px-4 text-center space-y-2">
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
          <p className="text-xs text-stone-400 opacity-80">
            Créé par <span className="text-[#cc6512] font-bold">@tidikappa</span>
          </p>
          <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
            v{__APP_VERSION__}
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
            <Suspense
              fallback={
                <p className="text-stone-300 text-sm font-serif tracking-widest uppercase opacity-70 py-12 text-center">
                  Chargement...
                </p>
              }
            >
              <Routes>
                <Route path="/" element={<ArmyBuilder />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/galerie" element={<GalleryPage />} />
                <Route path="/galerie/:id" element={<PublicArmyPage />} />
                <Route path="/comparer/:a/vs/:b" element={<ComparePage />} />
                <Route path="/my-lists" element={<MyListsPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
              </Routes>
            </Suspense>
          </Layout>
        </AuthProvider>
      </TranslationProvider>
    </BrowserRouter>
  );
}
