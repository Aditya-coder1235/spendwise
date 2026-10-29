import {
  Banknote,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  Coffee,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Laptop,
  MoreHorizontal,
  PiggyBank,
  Plane,
  Repeat,
  ShoppingBag,
  Sparkles,
  Tag,
  Ticket,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react';

const ICONS = {
  tag: Tag,
  utensils: Utensils,
  car: Car,
  home: Home,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  ticket: Ticket,
  plane: Plane,
  repeat: Repeat,
  sparkles: Sparkles,
  briefcase: Briefcase,
  laptop: Laptop,
  building: Building2,
  'trending-up': TrendingUp,
  gift: Gift,
  coffee: Coffee,
  'piggy-bank': PiggyBank,
  'more-horizontal': MoreHorizontal,
  banknote: Banknote,
  book: BookOpen,
};

export function CategoryIcon({ icon, color = '#64748b', size = 'md', className = '' }) {
  const Icon = ICONS[icon] || Tag;
  const sizes = { sm: 'size-8', md: 'size-9', lg: 'size-11' };
  const iconSizes = { sm: 14, md: 16, lg: 20 };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl ${sizes[size]} ${className}`}
      style={{ backgroundColor: `${color}16`, color }}
      aria-hidden="true"
    >
      <Icon size={iconSizes[size]} strokeWidth={2} />
    </span>
  );
}
