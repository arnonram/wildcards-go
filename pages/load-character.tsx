import { Box, Typography } from '@mui/material';
import LoadCharactersGrid from '../components/load-characters/LoadCharacterGrid';

export default function LoadCharacter() {
  return (
    <Box>
      <Typography
        variant="h4"
        sx={{
          fontFamily: "'Cinzel', 'Georgia', 'serif'",
          fontWeight: 600,
          mb: 3,
          color: '#e8e6e3',
        }}
      >
        Load a Character
      </Typography>
      <LoadCharactersGrid />
    </Box>
  );
}
