import { Box, Grid, TextField, Typography } from '@mui/material';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { RankDropdown } from './RankDropdown';

export default function BasicDetails() {
  const { wildcardData, setWildcardData } = useWildcard();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setWildcardData({ ...wildcardData, [name]: value });
  };

  return (
    <Box>
      <Typography variant="h3" align="center" sx={{ boxShadow: 3 }} fontFamily="fantasy">
        {wildcardData.name || 'Jane Doe'}
      </Typography>
      <h3>Basics</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid item>
          <TextField
            id="name"
            name="name"
            label="Name"
            value={wildcardData.name}
            onChange={handleChange}
            sx={{ minWidth: 300 }}
          />
        </Grid>
        <Grid item>
          <RankDropdown rank={wildcardData.rank} updateChanges={handleChange} />
        </Grid>
        <Grid item>
          <TextField
            id="race"
            name="race"
            label="Race"
            value={wildcardData.race}
            onChange={handleChange}
          />
        </Grid>
        <Grid item>
          <TextField
            id="bennies"
            name="bennies"
            label="Bennies"
            type="number"
            inputProps={{ min: 0 }}
            value={wildcardData.bennies}
            onChange={handleChange}
            sx={{ maxWidth: 80 }}
          />
        </Grid>

        <Grid item>
          <TextField
            id="conviction"
            name="conviction"
            label="Conviction"
            value={wildcardData.conviction}
            onChange={handleChange}
          />
        </Grid>
      </Grid>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        <Grid item>
          <Box>
            <TextField
              id="pace"
              name="pace"
              label="Pace"
              type="number"
              value={wildcardData.pace}
              onChange={handleChange}
              sx={{ maxWidth: 80 }}
            />
            <TextField
              id="pace-mod"
              name="paceMod"
              label="Pace Mod"
              type="number"
              value={wildcardData.paceMod}
              onChange={handleChange}
              sx={{ maxWidth: 80 }}
            />
          </Box>
        </Grid>
        <Grid item>
          <Box>
            <TextField
              id="parry"
              name="parry"
              label="Parry"
              type="number"
              value={wildcardData.parry}
              onChange={handleChange}
              sx={{ maxWidth: 80 }}
            />
            <TextField
              id="parry-mod"
              name="parryMod"
              label="Parry Mod"
              type="number"
              value={wildcardData.parryMod}
              onChange={handleChange}
              sx={{ maxWidth: 80 }}
            />
          </Box>
        </Grid>
        <Grid item>
          <Box>
            <TextField
              id="toughness"
              name="toughness"
              label="Toughness"
              type="number"
              value={wildcardData.toughness}
              onChange={handleChange}
              sx={{ maxWidth: 90 }}
            />
            <TextField
              id="toughness-mod"
              name="toughnessMod"
              label="Toughness Mod"
              type="number"
              value={wildcardData.toughnessMod}
              onChange={handleChange}
              sx={{ maxWidth: 120 }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
