const COLOURS = [
  'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
];

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ name, id = '', size = 'md' }) {
  const index = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % COLOURS.length;
  const sizes = { sm: 'size-8 text-[11px]', md: 'size-9 text-xs', lg: 'size-12 text-sm' };
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${COLOURS[index]} ${sizes[size]}`}
      aria-hidden="true"
    >
      {initials(name) || 'U'}
    </span>
  );
}
