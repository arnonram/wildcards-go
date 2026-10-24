import { useEffect, useRef, useState } from 'react';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { cn } from '../../helpers/cn';
import { WildCardProvider } from '../../helpers/context/wildcard-context';
import Armors from './armor/Armors';
import Basics from './Basics';
import Edges from './edges/Edges';
import GearList from './gear/Gear';
import Hindrances from './hindrances/Hindrances';
import Powers from './powers/Powers';
import { SheetHeader } from './SheetHeader';
import { SheetNav, type SheetNavItem } from './SheetNav';
import { StatusStrip } from './StatusStrip';
import Traits from './traits/Traits';
import Weapons from './weapons/Weapons';

const SECTIONS: SheetNavItem[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'traits', label: 'Traits' },
  { id: 'hindrances', label: 'Hindrances' },
  { id: 'edges', label: 'Edges' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'armor', label: 'Armor' },
  { id: 'powers', label: 'Powers' },
  { id: 'gear', label: 'Gear' },
];

export interface CharacterSheetProps {
  wildCard: WildCardCharacter;
  onDelete: () => void;
}

export default function CharacterSheet({ wildCard, onDelete }: CharacterSheetProps) {
  const [pinned, setPinned] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);

  // The sections' scroll margin must account for the pinned strip. Measure the
  // whole sticky group so the offset follows wrapping at every viewport width.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    if (!pinned) {
      sheet.style.removeProperty('--sheet-sticky-h');
      return;
    }

    const stickyGroup = stickyRef.current;
    if (!stickyGroup) return;

    const update = () => {
      sheet.style.setProperty('--sheet-sticky-h', `${stickyGroup.offsetHeight}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stickyGroup);
    return () => observer.disconnect();
  }, [pinned]);

  return (
    <WildCardProvider wildCard={wildCard}>
      <div ref={sheetRef} className="pb-16">
        <SheetHeader onDelete={onDelete} />
        <div
          ref={stickyRef}
          className={cn(
            'pt-4',
            pinned && 'sticky top-[var(--appbar-h)] z-20 bg-bg/95 shadow-sm backdrop-blur',
          )}
        >
          <StatusStrip pinned={pinned} onPinnedChange={setPinned} />
          <SheetNav items={SECTIONS} pinned={pinned} />
        </div>

        <div className="mt-8 space-y-10">
          <Basics />
          <Traits />
          <div className="grid gap-10 lg:grid-cols-2">
            <Hindrances />
            <Edges />
          </div>
          <Weapons />
          <Armors />
          <Powers />
          <GearList />
        </div>
      </div>
    </WildCardProvider>
  );
}
