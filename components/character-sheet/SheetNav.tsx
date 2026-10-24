import { useEffect, useState } from 'react';
import { cn } from '../../helpers/cn';

export interface SheetNavItem {
  id: string;
  label: string;
}

export function SheetNav({ items }: { items: SheetNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '');

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) return;

    const focusOffset = 160;
    let frame = 0;

    const update = () => {
      frame = 0;

      // The active section is the last one whose heading has crossed the
      // reading line below the sticky header.
      let current = sections[0].id;
      for (const section of sections) {
        if (section.getBoundingClientRect().top <= focusOffset) {
          current = section.id;
        }
      }

      // At the very end of the sheet the final sections cannot reach the
      // reading line, so make the last link active instead of stranding the
      // highlight on an earlier section.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (atBottom) current = sections[sections.length - 1].id;

      setActive((previous) => (previous === current ? previous : current));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  return (
    <nav
      aria-label="Character sheet sections"
      className="sticky top-[var(--appbar-h)] z-20 -mx-4 mt-4 border-y border-line bg-bg/90 px-4 backdrop-blur"
    >
      <ul className="flex h-[var(--nav-h)] items-stretch gap-1 overflow-x-auto">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  setActive(item.id);
                }}
                className={cn(
                  'relative flex h-full items-center whitespace-nowrap px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors',
                  isActive ? 'text-heading' : 'text-muted hover:text-ink',
                )}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute inset-x-1 bottom-0 h-0.5 bg-accent"
                    aria-hidden="true"
                  />
                )}
              </a>
            </li>
          );
        })}
      </ul>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-bg to-transparent sm:hidden"
      />
    </nav>
  );
}
