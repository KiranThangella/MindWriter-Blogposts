import { 
  Wand2, Scissors, Expand, Smile, Quote, HelpCircle, 
  Share2, Image as ImageIcon, Sparkles, Loader2, RefreshCw, Table
} from 'lucide-react';

interface ToolboxPanelProps {
  onAction: (action: string) => void;
  isEnhancing: boolean;
  onGenerateImagePrompt: () => void;
  isGeneratingImage: boolean;
  isLightMode?: boolean;
  // Locks every button in this panel, even ones not currently running
  // themselves — set from the parent's combined isAiLabBusy flag so a
  // slow action elsewhere (e.g. Internal Linking) blocks these too,
  // instead of letting two content-mutating AI actions run concurrently.
  disabled?: boolean;
}

export function ToolboxPanel({ onAction, isEnhancing, onGenerateImagePrompt, isGeneratingImage, isLightMode, disabled }: ToolboxPanelProps) {
  const tools = [
    { id: 'REWRITE', icon: RefreshCw, label: 'Rewrite Pro', desc: 'Polish & professionalize' },
    { id: 'HUMANIZE', icon: Smile, label: 'Humanize AI', desc: 'Pass AI detectors' },
    { id: 'EXPAND', icon: Expand, label: 'Expand Content', desc: 'Add more depth' },
    { id: 'SHORTEN', icon: Scissors, label: 'Summarize', desc: 'Keep it concise' },
    { id: 'FAQ', icon: HelpCircle, label: 'Generate FAQs', desc: 'Create Q&A section' },
    { id: 'SUMMARY', icon: Share2, label: 'Social Snippet', desc: 'Ready for Twitter/FB' },
    { id: 'COMPARISON', icon: Table, label: 'Comparison Table', desc: 'Create 2-3 item comparative matrix' },
  ];

  return (
    <div className="space-y-6 relative min-h-[420px]">
      {isEnhancing && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded-2xl p-6 text-center animate-in fade-in duration-300">
           <div className="h-12 w-12 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 flex items-center justify-center text-brand-purple mb-4 shadow-[0_0_20px_rgba(124,58,237,0.3)] animate-pulse">
              <Wand2 className="h-6 w-6 animate-spin duration-[3000ms]" />
           </div>
           <p className="text-xs font-black uppercase tracking-widest text-brand-purple mb-1">
              AI Content Lab
           </p>
           <p className="text-[10px] text-zinc-300 font-medium">
              Polishing content in background...
           </p>
           <div className="flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/30 text-[9px] uppercase tracking-widest text-brand-purple font-extrabold animate-pulse">
              <Loader2 className="animate-spin h-3 w-3" />
              Processing Request
           </div>
        </div>
      )}

      <h3 className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${isLightMode ? 'text-slate-400' : 'text-gray-400'}`}>
        <Wand2 className="h-4 w-4" />
        AI Content Lab
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onAction(tool.id)}
            disabled={disabled ?? isEnhancing}
            className={`flex flex-col items-center justify-center p-4 border rounded-2xl transition-all group disabled:opacity-50 ${isLightMode ? 'bg-slate-50 border-slate-200 hover:border-brand-purple/40 hover:bg-slate-100' : 'bg-zinc-900/60 border-white/5 hover:border-brand-purple/40 hover:bg-zinc-900'}`}
          >
            <tool.icon className={`h-5 w-5 group-hover:text-brand-purple mb-2 transition-colors ${isLightMode ? 'text-slate-300' : 'text-gray-500'}`} />
            <span className={`text-[10px] font-bold group-hover:text-brand-purple uppercase tracking-tight transition-colors ${isLightMode ? 'text-slate-600' : 'text-gray-300'}`}>{tool.label}</span>
            <span className={`text-[8px] mt-1 ${isLightMode ? 'text-slate-400' : 'text-gray-600'}`}>{tool.desc}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
         <button
            onClick={onGenerateImagePrompt}
            disabled={disabled ?? isGeneratingImage}
            className="w-full flex items-center justify-center gap-2 p-4 bg-brand-purple/10 border border-brand-purple/20 rounded-2xl hover:bg-brand-purple/20 transition-all text-brand-purple disabled:opacity-50"
         >
            {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span className="text-xs font-black uppercase tracking-widest">Gen Magic Image Prompt</span>
         </button>
         
         <div className={`p-4 rounded-2xl border italic ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'}`}>
            <p className={`text-[10px] leading-relaxed text-center ${isLightMode ? 'text-slate-400' : 'text-gray-500'}`}>
              "Select text in the editor to apply enhancement tools specifically to that section."
            </p>
         </div>
      </div>
    </div>
  );
}
