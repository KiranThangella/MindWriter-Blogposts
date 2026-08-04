import { useState } from "react";
import { LogoWordmark } from "./Logo";
import { safeFetchJson } from "../lib/api";

const SOCIAL_LINKS = [
  { key: "twitter", url: "https://twitter.com/MindWriterBlog" },
  { key: "facebook", url: "https://www.facebook.com/mindwriter.in/?locale=te_IN" },
  { key: "youtube", url: "https://www.youtube.com/@mindwriterin?si=saQpDcDcFk0bkQ_l" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subStatus, setSubStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setSubStatus({ type: "error", text: "సరైన ఇమెయిల్ ఇవ్వండి. (Please enter a valid email.)" });
      return;
    }
    setSubscribing(true);
    setSubStatus(null);
    try {
      const data = await safeFetchJson("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (data?.success) {
        setSubStatus({ type: "success", text: data.alreadySubscribed ? "మీరు ఇప్పటికే subscribe అయ్యారు!" : "Subscribe అయ్యారు! ధన్యవాదాలు." });
        setEmail("");
      } else {
        setSubStatus({ type: "error", text: data?.error || "Subscribe కాలేదు, మళ్ళీ ప్రయత్నించండి." });
      }
    } catch (e) {
      setSubStatus({ type: "error", text: "Subscribe కాలేదు, మళ్ళీ ప్రయత్నించండి." });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="mt-20 border-t border-white/10 bg-brand-bg pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-5 xl:gap-8 mb-16">
          
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <LogoWordmark />
            </div>
            <p className="mb-6 text-sm text-brand-text-muted max-w-xs leading-relaxed">
              Mindwriter is your trusted source for AI news, tools, tutorials and insights.
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ key, url }) => (
                <a 
                  key={key} 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 flex-col flex-shrink-0 items-center justify-center rounded bg-brand-card hover:bg-brand-purple hover:text-white transition-all"
                  aria-label={key}
                >
                  <div className="h-4 w-4 bg-current" style={{maskImage: `url('https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/${key}.svg')`, WebkitMaskImage: `url('https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/${key}.svg')`, maskSize: 'cover', WebkitMaskSize: 'cover'}} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-6 font-bold text-white">Quick Links</h4>
            <ul className="flex flex-col gap-3 text-sm text-brand-text-muted">
              <li><a href="/" className="hover:text-brand-purple transition-colors">Home</a></li>
              <li><a href="/about" className="hover:text-brand-purple transition-colors">About</a></li>
              <li><a href="/contact" className="hover:text-brand-purple transition-colors">Contact</a></li>
              <li><a href="/privacy-policy" className="hover:text-brand-purple transition-colors">Privacy Policy</a></li>
              <li><a href="/terms-of-use" className="hover:text-brand-purple transition-colors">Terms of Use</a></li>
              <li><a href="/disclaimer" className="hover:text-brand-purple transition-colors">Disclaimer</a></li>
              <li><a href="/dmca-policy" className="hover:text-brand-purple transition-colors">DMCA Policy</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="mb-6 font-bold text-white">Categories</h4>
            <ul className="flex flex-col gap-3 text-sm text-brand-text-muted">
              <li><a href="#" className="hover:text-brand-purple transition-colors">AI News</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Tech</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">AI Tools</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Business</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Blogging</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Automation</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-6 font-bold text-white">Resources</h4>
            <ul className="flex flex-col gap-3 text-sm text-brand-text-muted">
              <li><a href="/sitemap.xml" className="hover:text-brand-purple transition-colors">Sitemap</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Disclaimer</a></li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Write for Us</a></li>
              <li>
                <a
                  href="https://omg10.com/4/11387468"
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="hover:text-brand-purple transition-colors"
                >
                  Sponsored
                </a>
              </li>
              <li><a href="#" className="hover:text-brand-purple transition-colors">Newsletter</a></li>
            </ul>
          </div>

          {/* Newsletter Form */}
          <div className="lg:col-span-1">
            <h4 className="mb-6 font-bold text-white">Newsletter</h4>
            <p className="text-sm text-brand-text-muted mb-4">
              Get the latest updates in your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-lg bg-brand-card px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 border border-white/10 outline-none focus:border-brand-purple"
              />
              <button 
                type="submit"
                disabled={subscribing}
                className="rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-purple-hover transition-colors disabled:opacity-50"
              >
                {subscribing ? "..." : "Subscribe Now"}
              </button>
              {subStatus && (
                <p className={`text-xs ${subStatus.type === "success" ? "text-emerald-400" : "text-red-400"}`}>{subStatus.text}</p>
              )}
            </form>
          </div>

        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between text-sm text-brand-text-muted">
          <p>© 2024 Mindwriter. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
