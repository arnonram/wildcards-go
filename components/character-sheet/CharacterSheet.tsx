import { Box } from '@mui/material';
import type { WildCardCharacter } from '../../dtos/WildCardCharacter.dto';
import { WildCardProvider } from '../../helpers/context/wildcard-context';
import Armors from './armor/Armors';
import BasicDetails from './BasicDetails';
import Edges from './edges/Edges';
import GearList from './gear/Gear';
import Hindrances from './hindrances/Hindrances';
import Powers from './powers/Powers';
import Traits from './traits/Traits';
import Weapons from './weapons/Weapons';

export interface CharacterSheetProps {
  wildCard: WildCardCharacter;
}

export default function CharacterSheet({ wildCard }: CharacterSheetProps) {
  return (
    <WildCardProvider wildCard={wildCard}>
      <Box
        component="form"
        sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
        noValidate
        autoComplete="off"
        margin={3}
      >
        <BasicDetails />
        <Traits title="Attributes" isAttributes={true} />
        <Traits title="Skills" isAttributes={false} />
        <Hindrances />
        <Edges />
        <Armors />
        <Weapons />
        <Powers />
        <GearList />
      </Box>
    </WildCardProvider>
  );
}
