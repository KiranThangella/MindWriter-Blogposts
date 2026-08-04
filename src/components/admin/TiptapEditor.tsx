import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Quote, Image as ImageIcon, Link as LinkIcon, Table as TableIcon,
  Undo, Redo, Type, AlignLeft, AlignCenter, AlignRight, 
  Heading1, Heading2, Heading3, Code, Minus, Highlighter,
  Palette, ChevronDown, Trash2, Sparkles, Lock
} from 'lucide-react';
import { useEffect, forwardRef, useImperativeHandle, useState, useRef, useMemo } from 'react';

import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';
import { apiUrl, safeFetchJson } from '../../lib/api';

const FigureImageComponent = (props: any) => {
  const { node, deleteNode, selected } = props;
  const { src, alt } = node.attrs;

  return (
    <NodeViewWrapper className="image-figure hover-parent w-full my-8 relative group flex flex-col items-center justify-center">
      <div className={`relative rounded-2xl overflow-hidden border transition-all ${selected ? 'ring-2 ring-brand-purple' : 'border-white/10'}`}>
        <img 
          src={src} 
          alt={alt || "Image"} 
          className="rounded-2xl shadow-xl max-w-full h-auto mx-auto object-cover max-h-[480px]" 
        />
        
        {/* Sleek absolute hover overlay containing a centered delete button */}
        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
          <button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteNode();
            }}
            title="చిత్రాన్ని డిలీట్ చేయి (Delete this image)"
            className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 font-bold text-xs"
          >
            <Trash2 size={16} />
            <span>Delete Image</span>
          </button>
        </div>
      </div>
      
      {/* NodeViewContent for custom editable figcaption */}
      <NodeViewContent 
        as="div" 
        className="text-center text-sm text-gray-500 mt-3 italic px-4 outline-none w-full border-b border-transparent focus:border-brand-purple/30 empty:before:content-['Add_caption_here...'] empty:before:text-gray-400 empty:before:pointer-events-none transition-colors"
      />
    </NodeViewWrapper>
  );
};

const FigureImage = TiptapNode.create({
  name: 'figureImage',
  group: 'block',
  content: 'inline*',
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        contentElement: 'figcaption',
        // Only match if figcaption is present, or let it fallback to img
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;
          return node.querySelector('figcaption') ? {} : false;
        },
      },
      {
        tag: 'img',
        getAttrs: (node: string | HTMLElement) => {
          if (typeof node === 'string') return null;
          return {
            src: node.getAttribute('src'),
            alt: node.getAttribute('alt'),
            title: node.getAttribute('title'),
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      { class: 'image-figure my-8 flex flex-col items-center justify-center' },
      ['img', mergeAttributes(HTMLAttributes, { draggable: false, contenteditable: false, class: 'rounded-2xl shadow-xl border border-white/10 max-w-full h-auto mx-auto' })],
      ['figcaption', { class: 'text-center text-sm text-gray-500 mt-3 italic px-4 outline-none w-full border-b border-transparent focus:border-brand-purple/30 empty:before:content-["Add_caption_here..."] empty:before:text-gray-400 empty:before:pointer-events-none transition-colors' }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureImageComponent);
  },

  addCommands() {
    return {
      setFigureImage: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: {
            src: options.src,
            alt: options.alt,
            title: options.title,
          },
          content: [
            {
              type: 'text',
              text: options.caption || '',
            },
          ],
        });
      },
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figureImage: {
      setFigureImage: (options: { src: string; alt?: string; title?: string; caption?: string }) => ReturnType;
    }
  }
}

interface ImageUploadResult {
  url: string;
  altText?: string;
  caption?: string;
}

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<ImageUploadResult | null>;
  onOpenMediaLibrary?: () => void;
  onOpenArticleLibrary?: () => void;
  isLightMode?: boolean;
  // Current article's SEO focus keyword. Used only to make AI-generated alt
  // text naturally keyword-aware when a keyword is pasted/dropped/URL-linked
  // directly into the editor (uploads via the Media Library flow already
  // receive this through onImageUpload's own request).
  focusKeyword?: string;
}

export interface TiptapEditorRef {
  getSelection: () => string;
  replaceSelection: (content: string) => void;
  insertImage: (src: string, alt?: string, caption?: string) => void;
  insertLink: (url: string) => void;
}

// --- In-app replacement for window.prompt() chains -------------------------
// Anything that used to be a sequence of native browser prompt() popups
// (link URL, image URL + caption, affiliate/membership CTA fields) now opens
// this single styled modal instead. Supports one or many fields, paste
// works normally, Esc closes, Enter submits (unless focus is in a textarea),
// and it's sized to work on small/mobile screens (full-width sheet-like
// card with stacked, full-width buttons).
interface PromptModalField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  type?: 'text' | 'url' | 'textarea';
  required?: boolean;
}

interface PromptModalConfig {
  title: string;
  description?: string;
  fields: PromptModalField[];
  submitLabel?: string;
  removeLabel?: string;
  onRemove?: () => void;
  onSubmit: (values: Record<string, string>) => void;
}

const PromptModal = ({ config, onClose, isLightMode }: { config: PromptModalConfig; onClose: () => void; isLightMode?: boolean }) => {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    config.fields.forEach(f => { initial[f.key] = f.defaultValue || ''; });
    return initial;
  });
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    firstInputRef.current?.select?.();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const missingRequired = config.fields.some(f => f.required && !values[f.key]?.trim());
    if (missingRequired) return;
    config.onSubmit(values);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 sm:p-6 animate-fade-in ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/10'}`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className={`text-sm font-bold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>{config.title}</h3>
            {config.description && (
              <p className={`text-[11px] mt-1 ${isLightMode ? 'text-slate-400' : 'text-zinc-500'}`}>{config.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 p-1.5 rounded-lg transition-colors ${isLightMode ? 'text-slate-400 hover:bg-slate-100' : 'text-zinc-500 hover:bg-white/10'}`}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {config.fields.map((field, idx) => (
            <label key={field.key} className="flex flex-col gap-1.5">
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${isLightMode ? 'text-slate-500' : 'text-zinc-400'}`}>
                {field.label}{field.required && <span className="text-rose-500"> *</span>}
              </span>
              {field.type === 'textarea' ? (
                <textarea
                  ref={idx === 0 ? (firstInputRef as any) : undefined}
                  value={values[field.key]}
                  onChange={(e) => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className={`w-full text-sm rounded-xl px-3.5 py-2.5 border outline-none transition-colors resize-none ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-brand-purple' : 'bg-white/5 border-white/10 text-white focus:border-brand-purple'}`}
                />
              ) : (
                <input
                  ref={idx === 0 ? (firstInputRef as any) : undefined}
                  type={field.type === 'url' ? 'url' : 'text'}
                  inputMode={field.type === 'url' ? 'url' : 'text'}
                  value={values[field.key]}
                  onChange={(e) => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className={`w-full text-sm rounded-xl px-3.5 py-2.5 border outline-none transition-colors ${isLightMode ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-brand-purple' : 'bg-white/5 border-white/10 text-white focus:border-brand-purple'}`}
                />
              )}
            </label>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          {config.onRemove && (
            <button
              type="button"
              onClick={() => { config.onRemove?.(); onClose(); }}
              className="order-3 sm:order-1 w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              {config.removeLabel || 'Remove'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`order-2 w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${isLightMode ? 'text-slate-500 bg-slate-100 hover:bg-slate-200' : 'text-zinc-300 bg-white/5 hover:bg-white/10'}`}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="order-1 sm:order-3 sm:ml-auto w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-purple hover:bg-brand-purple/90 transition-colors"
          >
            {config.submitLabel || 'Insert'}
          </button>
        </div>
      </form>
    </div>
  );
};

const MenuBar = ({ editor, onImageUpload, onOpenMediaLibrary, onOpenArticleLibrary, isLightMode }: { editor: any, onImageUpload: (file: File) => Promise<ImageUploadResult | null>, onOpenMediaLibrary?: () => void, onOpenArticleLibrary?: () => void, isLightMode?: boolean }) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<PromptModalConfig | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) return null;

  const isImageSelected = editor.isActive('figureImage') || editor.isActive('image');

  const fonts = [
    { name: 'Standard Sans', value: 'Inter' },
    { name: 'Elegant Serif', value: 'ui-serif' },
    { name: 'Technical Mono', value: 'JetBrains Mono' },
    { name: 'Modern Display', value: 'Outfit' },
  ];

  const colors = [
    { name: 'Default', value: 'inherit' },
    { name: 'Brand Purple', value: '#8b5cf6' },
    { name: 'Action Blue', value: '#3b82f6' },
    { name: 'Success Green', value: '#10b981' },
    { name: 'Warning Rose', value: '#f43f5e' },
    { name: 'Accent Amber', value: '#f59e0b' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setActiveMenu(null);
    const file = e.target.files?.[0];
    if (file) {
      const result = await onImageUpload(file);
      if (result) {
        editor.chain().focus().setFigureImage({ src: result.url, alt: result.altText || '', caption: result.caption || '' }).run();
      }
    }
  };

  const addImageFromUrl = () => {
    setActiveMenu(null);
    setModalConfig({
      title: 'Image from URL',
      fields: [
        { key: 'url', label: 'Image URL', placeholder: 'https://...', type: 'url', required: true },
        { key: 'caption', label: 'Caption (optional)', placeholder: 'Add a caption...' },
      ],
      submitLabel: 'Insert Image',
      onSubmit: (values) => {
        if (!values.url?.trim()) return;
        editor.chain().focus().setFigureImage({ src: values.url.trim(), caption: values.caption?.trim() || '' }).run();
      },
    });
  };

  const localizeImages = async () => {
    setActiveMenu(null);
    if (!editor) return;

    const html = editor.getHTML();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const images = tempDiv.querySelectorAll('img');
    const externalImages = Array.from(images).filter(img => {
      const src = img.getAttribute('src') || '';
      return src.startsWith('http') && !src.includes('sanity.io') && !src.includes('firebasestorage') && !src.includes(window.location.hostname);
    });

    if (externalImages.length === 0) {
      alert("No external images found to localize.");
      return;
    }

    if (!confirm(`Found ${externalImages.length} external images. Would you like to download them and save them to your Media Library?`)) {
      return;
    }

    let successCount = 0;
    for (const img of externalImages) {
      const originalSrc = img.getAttribute('src');
      if (!originalSrc) continue;

      try {
        console.log(`Localizing image: ${originalSrc}`);
        const proxyUrl = apiUrl(`/api/proxy-image?url=${encodeURIComponent(originalSrc)}`);
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("Proxy fetch failed");

        const blob = await response.blob();
        const file = new File([blob], `imported-${Date.now()}.jpg`, { type: blob.type });

        const result = await onImageUpload(file);
        if (result) {
          editor.commands.command(({ tr, state }) => {
            let modified = false;
            state.doc.descendants((node, pos) => {
              if ((node.type.name === 'figureImage' || node.type.name === 'image') && node.attrs.src === originalSrc) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: result.url });
                modified = true;
              }
            });
            return modified;
          });
          successCount++;
        }
      } catch (err) {
        console.error(`Failed to localize image ${originalSrc}:`, err);
      }
    }

    alert(`Successfully localized ${successCount} out of ${externalImages.length} images.`);
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setModalConfig({
      title: previousUrl ? 'Edit Link' : 'Add Link',
      fields: [
        { key: 'url', label: 'URL', placeholder: 'https://...', defaultValue: previousUrl, type: 'url', required: true },
      ],
      submitLabel: previousUrl ? 'Update Link' : 'Insert Link',
      onRemove: previousUrl ? () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); } : undefined,
      removeLabel: 'Remove Link',
      onSubmit: (values) => {
        const url = values.url?.trim();
        if (!url) {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      },
    });
  };

  // Inserts a natural-looking, editorial-style recommendation card with a
  // CTA button — for affiliate links. Plain HTML (not a React component)
  // since it goes straight into the Tiptap document / stored article body,
  // same as the rest of the article content. Styling mirrors
  // components/AffiliateCTA.tsx so it looks the same wherever it's used.
  // Always includes the "Affiliate link" disclosure line — required by
  // FTC/Google guidelines, don't strip it out when editing manually.
  const insertAffiliateCTA = () => {
    setModalConfig({
      title: 'Insert Affiliate CTA',
      description: 'Adds an editorial recommendation card with a CTA button.',
      fields: [
        { key: 'eyebrow', label: 'Small label above headline', placeholder: 'Recommended tool', defaultValue: 'Recommended tool' },
        { key: 'title', label: 'Headline', placeholder: 'Write better in half the time', required: true },
        { key: 'description', label: 'Short description', placeholder: '1-2 sentences', type: 'textarea' },
        { key: 'buttonText', label: 'Button text', placeholder: 'Try Jasper free', defaultValue: 'Learn more' },
        { key: 'buttonUrl', label: 'Affiliate URL', placeholder: 'https://...', type: 'url', required: true },
      ],
      submitLabel: 'Insert CTA',
      onSubmit: (values) => {
        const title = values.title?.trim();
        const buttonUrl = values.buttonUrl?.trim();
        if (!title || !buttonUrl) return;
        const description = values.description?.trim() || '';
        const buttonText = values.buttonText?.trim() || 'Learn more';
        const eyebrow = values.eyebrow?.trim() || 'Recommended tool';

        const html = `
          <div class="affiliate-cta" style="margin:2rem 0;padding:1.25rem 1.5rem;border:1px solid rgba(124,58,237,0.15);background:rgba(124,58,237,0.05);border-radius:1rem;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#7c3aed;margin-bottom:6px;">${eyebrow}</div>
            <div style="font-size:17px;font-weight:700;margin-bottom:6px;">${title}</div>
            <p style="font-size:14px;line-height:1.6;margin:0 0 14px 0;">${description}</p>
            <a href="${buttonUrl}" target="_blank" rel="sponsored noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#7c3aed;color:#fff;padding:8px 18px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;">${buttonText} →</a>
            <div style="margin-top:8px;font-size:11px;color:#94a3b8;">Affiliate link — we may earn a commission at no extra cost to you.</div>
          </div>
        `;

        editor.chain().focus().insertContent(html).run();
      },
    });
  };

  // Same idea as insertAffiliateCTA, but for the ebook-membership "teaser
  // wall" — a locked-content style callout that links out to the separate
  // membership/ebook website (no auth/payment logic here, that all lives
  // on the other site; this is just an outbound CTA link).
  const insertMembershipCTA = () => {
    setModalConfig({
      title: 'Insert Membership CTA',
      description: 'Adds a locked-content teaser card linking to the membership/ebook site.',
      fields: [
        { key: 'eyebrow', label: 'Small label above headline', placeholder: 'Members Only', defaultValue: 'Members Only' },
        { key: 'title', label: 'Headline', placeholder: 'ఇంకా 6 కీలక పాఠాలు మిగిలి ఉన్నాయి', required: true },
        { key: 'description', label: 'Short description', placeholder: '1-2 sentences', type: 'textarea' },
        { key: 'buttonText', label: 'Button text', placeholder: 'Membership చూడండి', defaultValue: 'Membership చూడండి' },
        { key: 'buttonUrl', label: 'Membership/ebook site URL', placeholder: 'https://...', type: 'url', required: true },
      ],
      submitLabel: 'Insert CTA',
      onSubmit: (values) => {
        const title = values.title?.trim();
        const buttonUrl = values.buttonUrl?.trim();
        if (!title || !buttonUrl) return;
        const description = values.description?.trim() || '';
        const buttonText = values.buttonText?.trim() || 'Membership చూడండి';
        const eyebrow = values.eyebrow?.trim() || 'Members Only';

        const html = `
          <div class="membership-cta" style="margin:2rem 0;padding:1.25rem 1.5rem;border:2px dashed rgba(245,158,11,0.35);background:rgba(245,158,11,0.06);border-radius:1rem;text-align:center;">
            <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#d97706;margin-bottom:6px;">${eyebrow}</div>
            <div style="font-size:17px;font-weight:700;margin-bottom:6px;">${title}</div>
            <p style="font-size:14px;line-height:1.6;margin:0 auto 14px auto;max-width:32rem;">${description}</p>
            <a href="${buttonUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#f59e0b;color:#fff;padding:9px 20px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;">${buttonText} →</a>
          </div>
        `;

        editor.chain().focus().insertContent(html).run();
      },
    });
  };


  return (
    <>
    <div ref={menuRef} className={`flex flex-wrap gap-1 p-3 border-b sticky top-0 z-20 transition-colors items-center ${isLightMode ? 'bg-white/80 border-slate-100' : 'bg-zinc-900/80 border-white/10 backdrop-blur-md shadow-lg'}`}>
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 mr-2 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
         <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('bold') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <Bold size={15} />
         </button>
         <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('italic') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <Italic size={15} />
         </button>
         <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('underline') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <UnderlineIcon size={15} />
         </button>
      </div>
      
      {/* Font Family Dropdown */}
      <div className="relative">
        <button onClick={() => setActiveMenu(activeMenu === 'font' ? null : 'font')} className={`flex items-center gap-1.5 p-2 text-[10px] font-bold rounded-lg border transition-all ${isLightMode ? 'text-slate-500 border-slate-200 hover:bg-slate-50' : 'text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'}`}>
          <Type size={13} />
          <span className="hidden sm:inline uppercase tracking-widest px-1">Font</span>
          <ChevronDown size={10} className="opacity-40" />
        </button>
        <div className={`absolute top-full left-0 mt-2 ${activeMenu === 'font' ? 'block' : 'hidden'} border rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] z-50 p-1.5 min-w-[160px] ${isLightMode ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'}`}>
          {fonts.map(f => (
            <button
              key={f.value}
              onClick={() => { editor.chain().focus().setFontFamily(f.value).run(); setActiveMenu(null); }}
              className={`block w-full text-left px-4 py-2.5 text-[11px] font-medium rounded-lg transition-colors ${editor.isActive('textStyle', { fontFamily: f.value }) ? 'text-brand-purple bg-brand-purple/5' : (isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5')}`}
              style={{ fontFamily: f.value }}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div className="relative">
        <button onClick={() => setActiveMenu(activeMenu === 'color' ? null : 'color')} className={`flex items-center gap-1.5 p-2 text-[10px] font-bold border rounded-lg transition-all ${isLightMode ? 'text-slate-500 border-slate-200 hover:bg-slate-50' : 'text-zinc-400 border-white/5 hover:text-white hover:bg-white/5'}`}>
          <Palette size={13} />
          <span className="hidden sm:inline uppercase tracking-widest px-1">Color</span>
          <ChevronDown size={10} className="opacity-40" />
        </button>
        <div className={`absolute top-full left-0 mt-2 ${activeMenu === 'color' ? 'block' : 'hidden'} border rounded-xl z-50 p-3 min-w-[140px] ${isLightMode ? 'bg-white border-slate-200 shadow-xl' : 'bg-zinc-900 border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'}`}>
          <div className="grid grid-cols-3 gap-2">
            {colors.map(c => (
               <button
                  key={c.value}
                  onClick={() => { c.value === 'inherit' ? editor.chain().focus().unsetColor().run() : editor.chain().focus().setColor(c.value).run(); setActiveMenu(null); }}
                  className={`h-8 w-full rounded-md border transition-transform shadow-inner hover:scale-110 ${isLightMode ? 'border-slate-200' : 'border-white/10 ring-offset-zinc-900 hover:ring-2 hover:ring-white/20'}`}
                  style={{ backgroundColor: c.value === 'inherit' ? (isLightMode ? 'black' : 'white') : c.value }}
                  title={c.name}
               />
            ))}
          </div>
        </div>
      </div>

      <div className={`w-px h-6 mx-2 self-center ${isLightMode ? 'bg-slate-100' : 'bg-white/10'}`} />
      
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
         <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-2 rounded-md transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <Heading1 size={15} />
         </button>
         <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-2 rounded-md transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <Heading2 size={15} />
         </button>
         <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-2 rounded-md transition-colors ${editor.isActive('heading', { level: 3 }) ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <Heading3 size={15} />
         </button>
      </div>
      
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ml-1 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
         <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('bulletList') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <List size={15} />
         </button>
         <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('orderedList') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <ListOrdered size={15} />
         </button>
         <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={`p-2 rounded-md transition-colors ${editor.isActive('blockquote') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <Quote size={15} />
         </button>
      </div>
      
      <div className={`w-px h-6 mx-2 self-center ${isLightMode ? 'bg-slate-100' : 'bg-white/10'}`} />
      
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
         <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-2 rounded-md transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <AlignLeft size={15} />
         </button>
         <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-2 rounded-md transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <AlignCenter size={15} />
         </button>
      </div>

      <div className={`w-px h-6 mx-2 self-center ${isLightMode ? 'bg-slate-100' : 'bg-white/10'}`} />
      
      <div className={`flex items-center gap-0.5 rounded-lg p-0.5 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
         <button onClick={setLink} title="External Link" className={`p-2 rounded-md transition-colors ${editor.isActive('link') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10')}`}>
           <LinkIcon size={15} />
         </button>

         <button onClick={insertAffiliateCTA} title="Insert Affiliate CTA" className={`p-2 rounded-md transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10'}`}>
           <Sparkles size={15} />
         </button>

         <button onClick={insertMembershipCTA} title="Insert Membership CTA" className={`p-2 rounded-md transition-colors ${isLightMode ? 'text-slate-400 hover:text-slate-600' : 'text-zinc-400 hover:bg-white/10'}`}>
           <Lock size={15} />
         </button>
         
         {onOpenArticleLibrary && (
           <button 
             onClick={onOpenArticleLibrary} 
             title="Internal Article Link"
             className={`p-2 rounded-md transition-colors ${isLightMode ? 'text-brand-purple hover:bg-brand-purple/5' : 'text-brand-purple hover:bg-white/5 font-bold'}`}
           >
             <LinkIcon size={15} className="rotate-45" />
           </button>
         )}
         
         <div className="relative">
            <button onClick={() => setActiveMenu(activeMenu === 'image' ? null : 'image')} className={`p-2 rounded-md transition-colors ${isLightMode ? 'text-slate-400 hover:bg-slate-100' : 'text-zinc-400 hover:bg-white/10'}`}>
               <ImageIcon size={15} />
            </button>

            {isImageSelected && (
               <button 
                  onClick={() => {
                     if (editor.isActive('figureImage')) {
                        editor.chain().focus().deleteNode('figureImage').run();
                     } else {
                        editor.chain().focus().deleteNode('image').run();
                     }
                  }}
                  title="సెలెక్ట్ చేసిన ఇమేజ్‌ని తొలగించు (Delete selected image)"
                  className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-md transition-colors cursor-pointer active:scale-95 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider animate-fade-in"
               >
                  <Trash2 size={11} />
                  <span>Delete Image</span>
               </button>
            )}
            <div className={`absolute top-full left-0 mt-2 ${activeMenu === 'image' ? 'block' : 'hidden'} border rounded-xl z-50 p-1.5 min-w-[150px] animate-fade-in ${isLightMode ? 'bg-white border-slate-200 shadow-xl' : 'bg-zinc-900 border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'}`}>
               <label className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}>
                  <div className="flex flex-col">
                     <span>Upload File</span>
                     <span className="text-[9px] opacity-40 font-normal">PNG, JPG, WebP</span>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
               </label>
               <button 
                  onClick={addImageFromUrl}
                  className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-[11px] font-medium rounded-lg transition-colors ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}
               >
                  <div className="flex flex-col">
                     <span>Image from URL</span>
                     <span className="text-[9px] opacity-40 font-normal font-sans">Paste direct link</span>
                  </div>
               </button>
               {onOpenMediaLibrary && (
                  <button 
                     onClick={() => {
                        setActiveMenu(null);
                        onOpenMediaLibrary();
                     }}
                     className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-[11px] font-medium rounded-lg transition-colors ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                     <div className="flex flex-col">
                        <span>Select from Media</span>
                        <span className="text-[9px] opacity-40 font-normal">Our Media Library</span>
                     </div>
                  </button>
               )}
               <div className={`h-px my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`} />
               <button 
                  onClick={localizeImages}
                  className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-[11px] font-medium rounded-lg transition-colors ${isLightMode ? 'text-brand-purple hover:bg-brand-purple/5' : 'text-brand-purple hover:bg-brand-purple/10'}`}
               >
                  <div className="flex flex-col">
                     <span>Localize Images</span>
                     <span className="text-[9px] opacity-50 font-normal underline decoration-brand-purple/30">Save all external images</span>
                  </div>
               </button>
            </div>
         </div>

         <div className="relative">
            <button onClick={() => setActiveMenu(activeMenu === 'table' ? null : 'table')} className={`p-2 rounded-md transition-all ${editor.isActive('table') ? 'text-brand-purple' : (isLightMode ? 'text-slate-400 hover:bg-slate-100' : 'text-zinc-400 hover:bg-white/10')}`}>
               <TableIcon size={15} />
            </button>
            <div className={`absolute top-full left-0 mt-2 ${activeMenu === 'table' ? 'block' : 'hidden'} border rounded-xl z-50 p-1.5 min-w-[180px] ${isLightMode ? 'bg-white border-slate-200 shadow-xl' : 'bg-zinc-900 border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'}`}>
               <button onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setActiveMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[11px] rounded-lg ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}>Insert 3x3 Table</button>
               <button onClick={() => { editor.chain().focus().insertTable({ rows: 5, cols: 2, withHeaderRow: true }).run(); setActiveMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[11px] rounded-lg ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}>Comparison (2 Column)</button>
               <button onClick={() => { editor.chain().focus().insertTable({ rows: 5, cols: 3, withHeaderRow: true }).run(); setActiveMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[11px] rounded-lg ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}>Comparison (3 Column)</button>
               <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setActiveMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[11px] rounded-lg ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}>Add Column After</button>
               <button onClick={() => { editor.chain().focus().addRowAfter().run(); setActiveMenu(null); }} className={`w-full text-left px-4 py-2.5 text-[11px] rounded-lg ${isLightMode ? 'text-slate-600 hover:bg-slate-50' : 'text-zinc-300 hover:bg-white/5'}`}>Add Row After</button>
               <div className={`h-px my-1 ${isLightMode ? 'bg-slate-100' : 'bg-white/5'}`} />
               <button onClick={() => { editor.chain().focus().deleteTable().run(); setActiveMenu(null); }} className="w-full text-left px-4 py-2.5 text-[11px] rounded-lg hover:bg-rose-500/10 text-rose-400 font-bold">Delete Table</button>
            </div>
         </div>
      </div>

      <div className={`w-px h-6 mx-2 self-center ${isLightMode ? 'bg-slate-100' : 'bg-white/10'}`} />

      <button onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-2 rounded-lg transition-colors ${editor.isActive('codeBlock') ? 'text-brand-purple bg-brand-purple/10' : (isLightMode ? 'text-slate-400 hover:bg-slate-100' : 'text-zinc-400 hover:bg-white/10')}`}>
        <Code size={15} />
      </button>

      <div className="flex-grow" />
      
      <div className={`flex items-center gap-1 rounded-lg p-0.5 ${isLightMode ? 'bg-slate-50' : 'bg-white/5'}`}>
         <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-2 rounded-md text-zinc-500 hover:text-white transition-all disabled:opacity-20 hover:bg-zinc-800">
           <Undo size={14} />
         </button>
         <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-2 rounded-md text-zinc-500 hover:text-white transition-all disabled:opacity-20 hover:bg-zinc-800">
           <Redo size={14} />
         </button>
      </div>
    </div>
    {modalConfig && (
      <PromptModal config={modalConfig} onClose={() => setModalConfig(null)} isLightMode={isLightMode} />
    )}
    </>
  );
};

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(({ content, onChange, onImageUpload, onOpenMediaLibrary, onOpenArticleLibrary, isLightMode, focusKeyword }, ref) => {
  const onImageUploadRef = useRef(onImageUpload);
  const isSyncingFromProp = useRef(false);
  const lastSetContent = useRef(content);
  const focusKeywordRef = useRef(focusKeyword);
  
  useEffect(() => {
    onImageUploadRef.current = onImageUpload;
  }, [onImageUpload]);

  useEffect(() => {
    focusKeywordRef.current = focusKeyword;
  }, [focusKeyword]);

  const defaultImageUpload = async (file: File): Promise<ImageUploadResult> => {
     console.warn("No upload handler provided to TiptapEditor");
     return { url: URL.createObjectURL(file), altText: '', caption: '' };
  };

  // Fetches an accurate, image-specific alt-text + caption for an already-inserted
  // image (used for the paste-URL/base64/data-URI paths, which skip onImageUpload
  // entirely) and patches the matching figureImage node once ready. Runs in the
  // background so the image appears immediately; the caption/alt fill in a moment
  // later without blocking the editor.
  const patchImageMetaAsync = (editorInstance: any, src: string) => {
    safeFetchJson("/api/articles/generate-alt-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: src, keyword: focusKeywordRef.current || "" })
    }).then((data: any) => {
      if (!data?.success || !editorInstance || editorInstance.isDestroyed) return;
      editorInstance.commands.command(({ tr, state }: any) => {
        let modified = false;
        state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === 'figureImage' && node.attrs.src === src) {
            if (data.altText) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, alt: data.altText });
              modified = true;
            }
            if (data.caption && node.content.size === 0) {
              tr.insertText(data.caption, pos + 1);
              modified = true;
            }
          }
        });
        return modified;
      });
    }).catch((err: any) => {
      console.warn("Background alt-text/caption fetch failed:", err);
    });
  };

  const extensions = useMemo(() => [
    StarterKit.configure({
      // Tiptap v3's StarterKit now bundles Link and Underline by default.
      // Both are disabled here because this file configures its own
      // versions below (Link with custom styling/openOnClick behavior,
      // Underline for the toolbar button) — keeping both registered under
      // the same extension name was causing Tiptap's "Duplicate extension
      // names found: ['link', 'underline']" warning.
      link: false,
      underline: false,
    }),
    Underline,
    FigureImage,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-brand-purple underline decoration-brand-purple/30 underline-offset-4 font-semibold',
      },
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    Highlight,
    TextStyle,
    Color,
    FontFamily,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Placeholder.configure({
      placeholder: 'Write your next big story...',
    }),
  ], []);

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      // If we are currently setting content from a prop update, don't trigger onChange
      if (isSyncingFromProp.current) return;

      const html = editor.getHTML();
      lastSetContent.current = html;
      // Defer state updates to avoid React render-phase update warnings
      Promise.resolve().then(() => {
        onChange(html);
      });
    },
    editorProps: {
      attributes: {
        class: isLightMode 
          ? 'prose prose-zinc max-w-none focus:outline-none min-h-[600px] p-12 text-slate-800 text-lg leading-[1.8] prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2 prose-p:mb-6 prose-blockquote:border-brand-purple/40 prose-blockquote:font-medium prose-blockquote:italic prose-li:marker:text-brand-purple/50'
          : 'prose prose-invert prose-zinc max-w-none focus:outline-none min-h-[600px] p-12 text-zinc-300 text-lg leading-[1.8] prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2 prose-p:mb-6 prose-blockquote:border-brand-purple/40 prose-blockquote:font-medium prose-blockquote:italic prose-li:marker:text-brand-purple/50',
      },
      handleDrop(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file && file.type.startsWith("image/")) {
            event.preventDefault();
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const uploadFn = onImageUploadRef.current || defaultImageUpload;
            
            // Show custom cursor placement behavior
            uploadFn(file).then(result => {
              if (result && editor) {
                const imgOptions = { src: result.url, alt: result.altText || file.name, caption: result.caption || "" };
                if (coordinates) {
                  editor.chain().focus().setTextSelection(coordinates.pos).setFigureImage(imgOptions).run();
                } else {
                  editor.chain().focus().setFigureImage(imgOptions).run();
                }
              }
            }).catch(err => {
              console.error("Paste/drop upload failed:", err);
            });
            return true;
          }
        }
        return false;
      },
      handlePaste(view, event, slice) {
        if (event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) {
          const file = event.clipboardData.files[0];
          if (file && file.type.startsWith("image/")) {
            event.preventDefault();
            const uploadFn = onImageUploadRef.current || defaultImageUpload;
            
            uploadFn(file).then(result => {
              if (result && editor) {
                editor.chain().focus().setFigureImage({ src: result.url, alt: result.altText || file.name, caption: result.caption || "" }).run();
              }
            }).catch(err => {
              console.error("Paste/drop upload failed:", err);
            });
            return true;
          }
        }
        
        // Intercept pasted URLs that look like images or base64 data URIs
        if (event.clipboardData) {
          const text = event.clipboardData.getData('text/plain');
          if (text) {
            // Check for base64 image
            if (text.startsWith('data:image/')) {
              event.preventDefault();
              if (editor) {
                editor.chain().focus().setFigureImage({ src: text, alt: "Pasted Image", caption: "" }).run();
                // These paths bypass onImageUpload entirely, so fetch a real,
                // image-specific alt-text + caption in the background and
                // patch the node once it's ready.
                patchImageMetaAsync(editor, text);
              }
              return true;
            }
            
            // Check for direct image URLs
            if (text.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i) || text.includes('unsplash.com/') || text.includes('picsum.photos/')) {
              event.preventDefault();
              if (editor) {
                const trimmedSrc = text.trim();
                editor.chain().focus().setFigureImage({ src: trimmedSrc, alt: "Pasted Image", caption: "" }).run();
                patchImageMetaAsync(editor, trimmedSrc);
              }
              return true;
            }
          }
        }
        
        return false;
      }
    },
  });

  // Dynamically update editor classes when theme changes
  useEffect(() => {
    if (editor) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: isLightMode 
              ? 'prose prose-zinc max-w-none focus:outline-none min-h-[600px] p-12 text-slate-800 text-lg leading-[1.8] prose-headings:text-slate-900 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2 prose-p:mb-6 prose-blockquote:border-brand-purple/40 prose-blockquote:font-medium prose-blockquote:italic prose-li:marker:text-brand-purple/50'
              : 'prose prose-invert prose-zinc max-w-none focus:outline-none min-h-[600px] p-12 text-zinc-300 text-lg leading-[1.8] prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-4xl prose-h1:mb-8 prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2 prose-p:mb-6 prose-blockquote:border-brand-purple/40 prose-blockquote:font-medium prose-blockquote:italic prose-li:marker:text-brand-purple/50',
          }
        }
      });
    }
  }, [isLightMode, editor]);

  useImperativeHandle(ref, () => ({
    getSelection: () => {
      if (!editor) return "";
      const { from, to } = editor.state.selection;
      if (from === to) return "";
      
      try {
        const slice = editor.state.selection.content();
        const fragment = slice.content;
        const schema = editor.schema;
        const domSerializer = schema.cached.domSerializer || (schema as any).domSerializer;
        if (domSerializer) {
          const div = document.createElement('div');
          div.appendChild(domSerializer.serializeFragment(fragment));
          return div.innerHTML;
        }
      } catch (e) {
        console.warn("Failed to serialize selected HTML, falling back to text:", e);
      }
      return editor.state.doc.textBetween(from, to, " ");
    },
    replaceSelection: (newContent: string) => {
      if (!editor) return;
      editor.chain().focus().insertContent(newContent).run();
    },
    insertImage: (src: string, alt?: string, caption?: string) => {
      if (!editor) return;
      editor.chain().focus().setFigureImage({ src, alt, caption }).run();
    },
    insertLink: (url: string) => {
      if (!editor) return;
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }));

  // Keep editor content in sync when prop changes (e.g. on new generation)
  useEffect(() => {
    if (editor && !editor.isDestroyed && content !== lastSetContent.current && content !== editor.getHTML()) {
      const timeoutId = setTimeout(() => {
        if (!editor || editor.isDestroyed) return;
        try {
          // Only set content if we have a DOM element to avoid PM crashes
          if (!editor.options.element) return;
          
          isSyncingFromProp.current = true;
          lastSetContent.current = content;
          editor.commands.setContent(content, { emitUpdate: false }); // partial update if possible
          
          // Reset flag in next tick
          setTimeout(() => {
            if (!editor.isDestroyed) {
              isSyncingFromProp.current = false;
            }
          }, 0);
        } catch (err) {
          console.error("Error setting editor content:", err);
          isSyncingFromProp.current = false;
        }
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [content, editor]);

  return (
    <div className={`border rounded-[2rem] overflow-hidden backdrop-blur-2xl transition-all duration-500 shadow-2xl ring-1 ${isLightMode ? 'bg-white border-slate-200 ring-slate-100' : 'bg-zinc-900/60 border-white/5 ring-white/5'}`}>
      <MenuBar editor={editor} onImageUpload={onImageUpload || defaultImageUpload} onOpenMediaLibrary={onOpenMediaLibrary} onOpenArticleLibrary={onOpenArticleLibrary} isLightMode={isLightMode} />
      <div className="custom-scrollbar overflow-y-auto max-h-[70vh]">
        {editor && !editor.isDestroyed && <EditorContent editor={editor} />}
      </div>
    </div>
  );
});
