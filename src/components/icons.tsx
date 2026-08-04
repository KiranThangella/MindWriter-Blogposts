import { ComponentType } from 'react';
import {
  Brain, Cpu, Wrench, Briefcase, FileText, Settings, Sparkles, Rocket, Zap, Coffee,
  Globe, Search, BarChart3, Users, HeartPulse, GraduationCap, Landmark, Compass,
  TrendingUp, Star, Lightbulb, BookOpen, UserCircle, Newspaper, Palette, Utensils,
  Plane, Film, Music, Dumbbell, Baby, Leaf, MessageCircle, Eye,
} from 'lucide-react';

export const IconMap: Record<string, ComponentType<any>> = {
  Brain,
  Cpu,
  Wrench,
  Briefcase,
  FileText,
  Settings,
  Sparkles,
  Rocket,
  Zap,
  Coffee,
  Globe,
  Search,
  BarChart3,
  Users,
  HeartPulse,
  GraduationCap,
  Landmark,
  Compass,
  TrendingUp,
  Star,
  Lightbulb,
  BookOpen,
  UserCircle,
  Newspaper,
  Palette,
  Utensils,
  Plane,
  Film,
  Music,
  Dumbbell,
  Baby,
  Leaf,
  MessageCircle,
  Eye,
};

// A rotation of visually distinct icons used as a last-resort fallback for
// category names we don't recognize below — so two unrelated categories
// never both silently collapse to the same generic icon just because
// neither matched a keyword.
const FALLBACK_ROTATION = ['Sparkles', 'Compass', 'BookOpen', 'Star', 'Globe', 'Lightbulb'];

// Keyword -> icon name. Checked as case-insensitive substring matches
// against the category name, covering both English and common
// Telugu/transliterated names used across MindWriter's content categories.
// Order matters somewhat (first match wins) — more specific keywords are
// listed before more generic ones.
const CATEGORY_KEYWORDS: Array<[string[], string]> = [
  [['ai news', 'news', 'వార్తలు'], 'Zap'],
  [['ai tools', 'tools', 'పరికరాలు'], 'Wrench'],
  [['automation', 'ఆటోమేషన్'], 'Rocket'],
  [['tech', 'technology', 'టెక్నాలజీ'], 'Cpu'],
  [['business', 'వ్యాపారం', 'finance', 'ఆర్థిక'], 'Briefcase'],
  [['blog', 'బ్లాగ్'], 'FileText'],
  [['psychology', 'మనస్తత్వ', 'మనస్సు', 'mind'], 'Brain'],
  [['mytholog', 'పురాణ', 'ఇతిహాస', 'mahabharat', 'ramayan'], 'Landmark'],
  [['spiritual', 'ఆధ్యాత్మిక', 'devotion', 'భక్తి'], 'Sparkles'],
  [['wellness', 'health', 'ఆరోగ్యం', 'fitness', 'వెల్నెస్'], 'HeartPulse'],
  [['relationship', 'సంబంధాలు', 'family', 'కుటుంబం'], 'Users'],
  [['student', 'విద్యార్థి', 'education', 'విద్య'], 'GraduationCap'],
  [['history', 'చరిత్ర'], 'Landmark'],
  [['biography', 'జీవిత చరిత్ర', 'జీవితం'], 'UserCircle'],
  [['motivat', 'ప్రేరణ', 'self-help', 'self help', 'ఆత్మవిశ్వాసం'], 'TrendingUp'],
  [['review', 'సమీక్ష'], 'Star'],
  [['insight', 'opinion', 'analysis', 'అభిప్రాయం'], 'Lightbulb'],
  [['food', 'recipe', 'ఆహారం', 'వంటకాలు'], 'Utensils'],
  [['travel', 'ప్రయాణం'], 'Plane'],
  [['movie', 'cinema', 'సినిమా', 'entertainment', 'వినోదం'], 'Film'],
  [['music', 'సంగీతం'], 'Music'],
  [['sport', 'క్రీడలు', 'gym'], 'Dumbbell'],
  [['parenting', 'పిల్లలు', 'kids'], 'Baby'],
  [['nature', 'environment', 'ప్రకృతి'], 'Leaf'],
  [['art', 'design', 'కళ'], 'Palette'],
  [['world', 'global', 'ప్రపంచం'], 'Globe'],
  // MindWriter psychology vertical (see master content-generation prompt).
  // 'psychology' above already catches most "<X> Psychology" category names;
  // these fill in the ones that don't contain that word.
  [['emotional intelligence'], 'HeartPulse'],
  [['personality'], 'UserCircle'],
  [['habit'], 'Coffee'],
  [['decision'], 'Compass'],
  [['productiv'], 'Rocket'],
  [['mental model'], 'Lightbulb'],
  [['communicat'], 'MessageCircle'],
  [['leadership'], 'Briefcase'],
  [['workplace'], 'Briefcase'],
  [['consumer'], 'BarChart3'],
  [['digital psychology', 'digital behavior'], 'Globe'],
  [['neuroscience'], 'Brain'],
  [['self awareness', 'self-awareness'], 'Eye'],
];

function hashStringToIndex(str: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

/**
 * Resolves the best icon for a category.
 * 1. If Sanity's `icon` field is set to a real, known icon name, use it.
 * 2. Otherwise, infer a fitting icon from the category name via keyword
 *    matching (covers the case Sanity categories were created without ever
 *    setting the icon field — was previously always silently 'Brain').
 * 3. If nothing matches, fall back to a name-hashed rotation so unrelated
 *    categories still end up visually distinct rather than identical.
 */
export function getCategoryIcon(categoryName: string, explicitIcon?: string): ComponentType<any> {
  if (explicitIcon && explicitIcon !== 'Brain' && IconMap[explicitIcon]) {
    return IconMap[explicitIcon];
  }

  const lowerName = (categoryName || '').toLowerCase();
  for (const [keywords, iconName] of CATEGORY_KEYWORDS) {
    if (keywords.some((kw) => lowerName.includes(kw))) {
      return IconMap[iconName];
    }
  }

  // Explicit icon was set but didn't match anything known — still better
  // than nothing.
  if (explicitIcon && IconMap[explicitIcon]) {
    return IconMap[explicitIcon];
  }

  const fallbackName = FALLBACK_ROTATION[hashStringToIndex(categoryName || 'category', FALLBACK_ROTATION.length)];
  return IconMap[fallbackName];
}
