import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { Power } from '../../../dtos/Power.dto';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import AddNewButton from '../AddNewButton';
import PowerCard from './PowerCard';

export default function Powers() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [powers, setPowers] = useState<Power[]>(wildcardData?.powers || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPower, setNewPower] = useState<Power>(new Power(''));

  const handleOpenDialog = () => {
    setNewPower(new Power(''));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const updated = [...powers, newPower];
    setPowers(updated);
    setWildcardData({ ...wildcardData, powers: updated });
    setDialogOpen(false);
  };

  const handleUpdate = (updatedPower: Power) => {
    const powerIndex = powers.findIndex((x) => x._id === updatedPower._id);
    const currentPowers = powers;
    currentPowers[powerIndex] = updatedPower;
    setPowers([...currentPowers]);
  };

  const handleDelete = (id: string) => {
    const cleanedPowers = powers.filter((x) => x._id !== id);
    setPowers([...cleanedPowers]);
  };

  const powerUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setNewPower({
      ...newPower,
      [name]: value,
    });
  };

  return (
    <Box>
      <h3>Powers</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {powers.map((power) => (
          <PowerCard
            key={`power-${power._id}`}
            power={power}
            updatePower={handleUpdate}
            deletePower={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Power" onClick={handleOpenDialog} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: '70%', ml: 3, mt: 2 }}
            name="name"
            id="power-name"
            margin="dense"
            label="Power Name"
            value={newPower.name}
            onChange={powerUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            name="pp"
            id="power-pp"
            margin="dense"
            label="Power Points"
            fullWidth
            value={newPower.pp}
            onChange={powerUpdate}
            variant="standard"
          />
          <TextField
            name="range"
            id="power-range"
            margin="dense"
            label="Range"
            fullWidth
            value={newPower.range}
            onChange={powerUpdate}
            variant="standard"
          />
          <TextField
            name="duration"
            id="power-duration"
            margin="dense"
            label="Duration"
            fullWidth
            value={newPower.duration}
            onChange={powerUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            multiline
            name="effect"
            id="power-effect"
            margin="dense"
            label="Effect"
            fullWidth
            autoComplete="off"
            value={newPower.effect}
            onChange={powerUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          />
          <TextField
            multiline
            name="comments"
            id="power-comments"
            margin="dense"
            label="Comments"
            fullWidth
            autoComplete="off"
            value={newPower.comments}
            onChange={powerUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
