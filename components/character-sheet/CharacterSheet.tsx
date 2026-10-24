import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
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
  return (
    <WildCardProvider wildCard={wildCard}>
      <div className="pb-16">
        <SheetHeader onDelete={onDelete} />
        <StatusStrip />
        <SheetNav items={SECTIONS} />

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
