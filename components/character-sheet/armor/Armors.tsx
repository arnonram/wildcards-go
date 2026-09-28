import { Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useState } from "react";
import { Armor } from "../../../dtos/Armor.dto";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import ArmorCard from "./ArmorCard";

export default function Armors() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [armors, setArmors] = useState<Armor[]>(wildcardData?.armors || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newArmor, setNewArmor] = useState<Armor>(new Armor(""));

  const handleOpenDialog = () => {
    setNewArmor(new Armor(""));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const updated = [...armors, newArmor];
    setArmors(updated);
    setWildcardData({ ...wildcardData, armors: updated });
    setDialogOpen(false);
  };

  const handleUpdate = (updatedArmor: Armor) => {
    const armorIndex = armors.findIndex((x) => x._id === updatedArmor._id);
    const currentArmors = armors;
    currentArmors[armorIndex] = updatedArmor;
    setArmors([...currentArmors]);
  };

  const handleDelete = (id: string) => {
    const cleanedArmors = armors.filter((x) => x._id !== id);
    setArmors([...cleanedArmors]);
  };

  const armorUpdate = (event: any) => {
    const { name, value } = event.target;
    setNewArmor({
      ...newArmor,
      [name]: value,
    });
  };

  return (
    <Box>
      <h3>Armor</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {armors.map((armor) => (
          <ArmorCard
            key={`armor-${armor._id}`}
            armor={armor}
            updateArmor={handleUpdate}
            deleteArmor={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Armor" onClick={handleOpenDialog} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: "70%", ml: 3, mt: 2 }}
            name="name"
            id="armor-name"
            margin="dense"
            label="Armor Name"
            value={newArmor.name}
            onChange={armorUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            name="armorBonus"
            id="armor-armorBonus"
            margin="dense"
            label="Armor Bonus"
            fullWidth
            value={newArmor.armorBonus}
            onChange={armorUpdate}
            variant="standard"
          />
          <TextField
            name="locations"
            id="armor-locations"
            margin="dense"
            label="Locations"
            fullWidth
            value={newArmor.locations}
            onChange={armorUpdate}
            variant="standard"
          />
          <TextField
            name="weight"
            id="armor-weight"
            margin="dense"
            label="Weight"
            fullWidth
            value={newArmor.weight}
            onChange={armorUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            name="cost"
            id="armor-cost"
            margin="dense"
            label="Cost"
            fullWidth
            value={newArmor.cost}
            onChange={armorUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            multiline
            name="comments"
            id="armor-comments"
            margin="dense"
            label="Comments"
            fullWidth
            autoComplete="off"
            value={newArmor.comments}
            onChange={armorUpdate}
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
