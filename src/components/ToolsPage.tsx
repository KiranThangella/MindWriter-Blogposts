import * as LucideIcons from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

interface ToolsPageProps {
  tools: any[];
  loading?: boolean;
  onSelectTool: (tool: any) => void;
  onBack: () => void;
}

export function ToolsPage({ tools, loading, onSelectTool, onBack }: ToolsPageProps) {
  const grouped = tools.reduce<Record<string, any[]>>((acc, tool: any) => {
    const cat = tool.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Home
      </button>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Our Tools</h1>
      <p className="text-gray-400 mb-10">Free, quick utilities built right into MindWriter.</p>

      {loading ? (
        <div className="text-gray-400 text-sm py-16 text-center">Loading tools...</div>
      ) : tools.length === 0 ? (
        <div className="text-gray-400 text-sm py-16 text-center">
          ప్రస్తుతం ఏ tools అందుబాటులో లేవు. త్వరలో వస్తాయి!
        </div>
      ) : (
        Object.entries(grouped).map(([category, catTools]) => (
          <div key={category} className="mb-10 last:mb-0">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-purple mb-4">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {catTools.map((tool: any) => {
                const Icon = (LucideIcons as any)[tool.icon] || LucideIcons.Cpu;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      if (tool.isInternal) {
                        onSelectTool(tool.internalId);
                      } else {
                        window.open(tool.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="text-left bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-brand-purple/40 transition-all"
                  >
                    <Icon className="text-brand-purple h-8 w-8 mb-4" />
                    <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
                    <p className="text-gray-400 text-sm mt-2">{tool.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
