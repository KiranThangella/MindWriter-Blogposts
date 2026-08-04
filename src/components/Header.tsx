import { Moon, Sun, Search, Menu, X, Bell, BellRing } from "lucide-react";
import { useState, useEffect } from "react";
import { LogoWordmark } from "./Logo";
import { isPushSupported, getPushSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from "../lib/push-subscribe";

interface HeaderProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
  onToolsClick: () => void;
  onCategorySelect?: (categoryName: string | null) => void;
  onStaticPageSelect?: (page: 'about' | 'contact' | 'privacy' | 'terms' | 'disclaimer' | 'dmca') => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function Header({ isDarkMode, onThemeToggle, onToolsClick, onCategorySelect, onStaticPageSelect, searchQuery, onSearchQueryChange }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [pushStatus, setPushStatus] = useState<"subscribed" | "unsubscribed" | "denied" | "unsupported" | "checking">("checking");

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus("unsupported");
      return;
    }
    getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleBellClick = async () => {
    if (pushStatus === "subscribed") {
      setPushStatus("checking");
      await unsubscribeFromPush();
      setPushStatus("unsubscribed");
    } else if (pushStatus === "unsubscribed") {
      setPushStatus("checking");
      const result = await subscribeToPush();
      setPushStatus(result.success ? "subscribed" : "unsubscribed");
    }
    // "denied" and "unsupported" states are non-interactive — see the
    // button's title attribute for why, rather than a silent no-op.
  };

  const navLinks = [
    { name: "Home", href: "#", onClick: () => onCategorySelect?.(null) },
    { name: "AI News", href: "#", onClick: () => onCategorySelect?.("AI News") },
    { name: "Tech", href: "#", onClick: () => onCategorySelect?.("Tech") },
    { name: "Tools", href: "#", onClick: onToolsClick },
    { name: "Business", href: "#", onClick: () => onCategorySelect?.("Business") },
    { name: "Blogging", href: "#", onClick: () => onCategorySelect?.("Blogging") },
    { name: "About", href: "/about", onClick: () => onStaticPageSelect?.("about") },
    { name: "Contact", href: "/contact", onClick: () => onStaticPageSelect?.("contact") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-brand-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <span className="mw-signal-dot hidden sm:inline-block" aria-hidden="true" />
          <LogoWordmark onClick={() => onCategorySelect?.(null)} />
        </div>

        {/* Navigation - Desktop */}
        <nav className="hidden items-center gap-8 md:flex text-xs font-medium uppercase tracking-wider text-gray-300" style={{ fontFamily: "var(--font-mono-ui)" }}>
          {navLinks.map(link => (
            <a key={link.name} href={link.href} onClick={(e) => { e.preventDefault(); link.onClick?.(); }} className="hover:text-[var(--color-brand-teal)] transition-colors">{link.name}</a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <span className="mw-coord hidden lg:inline-block" aria-hidden="true">17.3850°N&nbsp;·&nbsp;78.4867°E</span>
          {pushStatus !== "unsupported" && (
            <button
              onClick={handleBellClick}
              disabled={pushStatus === "checking" || pushStatus === "denied"}
              className={`transition-colors p-2 rounded-lg hover:bg-white/5 transition-all focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                pushStatus === "subscribed" ? "text-[var(--color-brand-teal)]" : "text-gray-400 hover:text-white"
              }`}
              title={
                pushStatus === "denied"
                  ? "Notifications blocked — enable them in your browser's site settings to subscribe."
                  : pushStatus === "subscribed"
                  ? "Breaking news alerts on — click to turn off"
                  : "Get breaking news alerts"
              }
              aria-label={pushStatus === "subscribed" ? "Turn off notifications" : "Turn on notifications"}
            >
              {pushStatus === "subscribed" ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </button>
          )}
          <button 
            onClick={onThemeToggle}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 transition-all focus:outline-none"
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            id="theme-toggle"
          >
            {isDarkMode ? <Sun className="h-5 w-5 text-amber-400 hover:text-amber-300" /> : <Moon className="h-5 w-5" />}
          </button>
          <button 
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={`transition-colors p-2 rounded-lg hover:bg-white/5 transition-all focus:outline-none ${isSearchVisible ? 'text-white' : 'text-gray-400 hover:text-white'}`}
            aria-label={isSearchVisible ? "Close search" : "Open search"}
          >
            <Search className="h-5 w-5" />
          </button>
          {/* Hamburger Menu Button */}
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      
      {/* Search Input Bar (Desktop) */}
      {isSearchVisible && (
        <div className="absolute top-20 left-0 w-full bg-brand-bg border-b border-white/10 p-4 shadow-xl z-50">
          <div className="mx-auto max-w-7xl">
            <input 
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple"
              autoFocus
            />
          </div>
        </div>
      )}
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="absolute top-20 left-0 w-full bg-brand-bg border-b border-white/10 md:hidden p-6 flex flex-col gap-4">
          {navLinks.map(link => (
            <a key={link.name} href={link.href} onClick={(e) => { e.preventDefault(); link.onClick?.(); setIsMobileMenuOpen(false); }} className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
              {link.name}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
