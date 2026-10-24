import { type CSSProperties, useEffect, useRef, useState } from 'react';
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
  const statusRef = useRef<HTMLDivElement>(null);

  // Track the status card's real height so the section nav can sit directly
  // beneath it when pinned, even when its stats wrap onto more rows.
  useEffect(() => {
    const sheet = sheetRef.current;
    const status = statusRef.current;
    if (!sheet || !status) return;

    const update = () => {
      sheet.style.setProperty('--status-h', `${status.offsetHeight}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(status);
    return () => observer.disconnect();
  }, []);

  return (
    <WildCardProvider wildCard={wildCard}>
      <div
        ref={sheetRef}
        className="pb-16"
        style={
          pinned
            ? ({
                '--sheet-sticky-h': 'calc(var(--status-h) + var(--nav-h))',
              } as CSSProperties)
            : undefined
        }
      >
        <SheetHeader onDelete={onDelete} />
        <div
          ref={statusRef}
          className={cn(
            'pt-4',
            pinned && 'sticky top-[var(--appbar-h)] z-20 bg-bg/95 shadow-sm backdrop-blur',
          )}
        >
          <StatusStrip pinned={pinned} onPinnedChange={setPinned} />
        </div>
        <SheetNav items={SECTIONS} pinned={pinned} />

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
