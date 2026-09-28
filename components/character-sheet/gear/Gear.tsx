import { Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useState } from "react";
import { Gear } from "../../../dtos/Gear.dto";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import GearCard from "./GearCard";

export default function GearList() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [gear, setGear] = useState<Gear[]>(wildcardData?.gear || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGear, setNewGear] = useState<Gear>(new Gear(""));

  const handleOpenDialog = () => {
    setNewGear(new Gear(""));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const updated = [...gear, newGear];
    setGear(updated);
    setWildcardData({ ...wildcardData, gear: updated });
    setDialogOpen(false);
  };

  const handleUpdate = (updatedGear: Gear) => {
    const gearIndex = gear.findIndex((x) => x._id === updatedGear._id);
    const currentGear = gear;
    currentGear[gearIndex] = updatedGear;
    setGear([...currentGear]);
  };

  const handleDelete = (id: string) => {
    const cleanedGear = gear.filter((x) => x._id !== id);
    setGear([...cleanedGear]);
  };

  const gearUpdate = (event: any) => {
    const { name, value } = event.target;
    setNewGear({
      ...newGear,
      [name]: value,
    });
  };

  return (
    <Box>
      <h3>Gear</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {gear.map((item) => (
          <GearCard
            key={`gear-${item._id}`}
            gear={item}
            updateGear={handleUpdate}
            deleteGear={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Gear" onClick={handleOpenDialog} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: "70%", ml: 3, mt: 2 }}
            name="name"
            id="gear-name"
            margin="dense"
            label="Gear Name"
            value={newGear.name}
            onChange={gearUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            name="weight"
            id="gear-weight"
            margin="dense"
            label="Weight"
            fullWidth
            value={newGear.weight}
            onChange={gearUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            name="cost"
            id="gear-cost"
            margin="dense"
            label="Cost"
            fullWidth
            value={newGear.cost}
            onChange={gearUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            multiline
            name="details"
            id="gear-details"
            margin="dense"
            label="Details"
            fullWidth
            autoComplete="off"
            value={newGear.details}
            onChange={gearUpdate}
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
