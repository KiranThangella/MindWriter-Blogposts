import React from 'react';
import * as LucideIcons from 'lucide-react';
import { X, ArrowRight } from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: any) => void;
  onViewAll?: () => void;
  tools: any[];
  loading?: boolean;
}

export function ToolsModal({ isOpen, onClose, onSelectTool, onViewAll, tools, loading }: ToolsModalProps) {
  if (!isOpen) return null;

  const grouped = tools.reduce<Record<string, any[]>>((acc, tool: any) => {
    const cat = tool.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[85vh] overflow-y-auto bg-brand-card border border-white/10 rounded-2xl shadow-2xl p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">Our Tools</h2>

        {loading ? (
          <div className="text-gray-400 text-sm py-8 text-center">Loading tools...</div>
        ) : tools.length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">
            ప్రస్తుతం ఏ tools అందుబాటులో లేవు. త్వరలో వస్తాయి!
          </div>
        ) : (
          Object.entries(grouped).map(([category, catTools]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-xs font-bold uppercase tracking-wide text-brand-purple mb-3">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        onClose();
                      }}
                      className="text-left bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <Icon className="text-brand-purple h-7 w-7 mb-3" />
                      <h4 className="text-base font-semibold text-white">{tool.name}</h4>
                      <p className="text-gray-400 text-sm mt-1.5 line-clamp-2">{tool.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {onViewAll && tools.length > 0 && (
          <button
            onClick={() => { onViewAll(); onClose(); }}
            className="mt-2 flex items-center gap-1.5 text-sm text-brand-purple hover:text-white font-semibold transition-colors"
          >
            View all tools <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
