import { Box, Grid, TextField } from '@mui/material';
import Image from 'next/image';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { useWildcard } from '../../helpers/context/wildcard-context';
import { RankDropdown } from './RankDropdown';

export default function BasicDetails() {
  const { wildcardData, setWildcardData } = useWildcard();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setWildcardData({ ...wildcardData, [name]: value });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setWildcardData({ ...wildcardData, imageUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 120,
            height: 120,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <label htmlFor="character-image-upload" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {wildcardData.imageUrl ? (
              <Image src={wildcardData.imageUrl} alt="Character" width={120} height={120} style={{ objectFit: 'cover' }} />
            ) : (
              <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <PhotoCameraIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
                <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
                  Upload Image
                </Box>
              </Box>
            )}
          </label>
          <input
            id="character-image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </Box>
      </Box>
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
