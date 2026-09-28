import { Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useState } from "react";
import { Weapon } from "../../../dtos/Weapon.dto";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import WeaponCard from "./WeaponCard";

export default function Weapons() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [weapons, setWeapons] = useState<Weapon[]>(wildcardData?.weapons || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWeapon, setNewWeapon] = useState<Weapon>(new Weapon(""));

  const handleOpenDialog = () => {
    setNewWeapon(new Weapon(""));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const updated = [...weapons, newWeapon];
    setWeapons(updated);
    setWildcardData({ ...wildcardData, weapons: updated });
    setDialogOpen(false);
  };

  const handleUpdate = (updatedWeapon: Weapon) => {
    const weaponIndex = weapons.findIndex((x) => x._id === updatedWeapon._id);
    const currentWeapons = weapons;
    currentWeapons[weaponIndex] = updatedWeapon;
    setWeapons([...currentWeapons]);
  };

  const handleDelete = (id: string) => {
    const cleanedWeapons = weapons.filter((x) => x._id !== id);
    setWeapons([...cleanedWeapons]);
  };

  const weaponUpdate = (event: any) => {
    const { name, value } = event.target;
    setNewWeapon({
      ...newWeapon,
      [name]: value,
    });
  };

  return (
    <Box>
      <h3>Weapons</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {weapons.map((weapon) => (
          <WeaponCard
            key={`weapon-${weapon._id}`}
            weapon={weapon}
            updateWeapon={handleUpdate}
            deleteWeapon={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Weapon" onClick={handleOpenDialog} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: "70%", ml: 3, mt: 2 }}
            name="name"
            id="weapon-name"
            margin="dense"
            label="Weapon Name"
            value={newWeapon.name}
            onChange={weaponUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            name="damage"
            id="weapon-damage"
            margin="dense"
            label="Damage"
            fullWidth
            value={newWeapon.damage}
            onChange={weaponUpdate}
            variant="standard"
          />
          <TextField
            name="range"
            id="weapon-range"
            margin="dense"
            label="Range"
            fullWidth
            value={newWeapon.range}
            onChange={weaponUpdate}
            variant="standard"
          />
          <TextField
            name="ap"
            id="weapon-ap"
            margin="dense"
            label="AP"
            fullWidth
            value={newWeapon.ap}
            onChange={weaponUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            name="rof"
            id="weapon-rof"
            margin="dense"
            label="ROF"
            fullWidth
            value={newWeapon.rof}
            onChange={weaponUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            name="shots"
            id="weapon-shots"
            margin="dense"
            label="Shots"
            fullWidth
            value={newWeapon.shots}
            onChange={weaponUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            name="ammo"
            id="weapon-ammo"
            margin="dense"
            label="Ammo"
            fullWidth
            value={newWeapon.ammo}
            onChange={weaponUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            name="minStr"
            id="weapon-minStr"
            margin="dense"
            label="Min Strength"
            fullWidth
            value={newWeapon.minStr}
            onChange={weaponUpdate}
            variant="standard"
          />
          <TextField
            name="weight"
            id="weapon-weight"
            margin="dense"
            label="Weight"
            fullWidth
            value={newWeapon.weight}
            onChange={weaponUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            multiline
            name="comments"
            id="weapon-comments"
            margin="dense"
            label="Comments"
            fullWidth
            autoComplete="off"
            value={newWeapon.comments}
            onChange={weaponUpdate}
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
