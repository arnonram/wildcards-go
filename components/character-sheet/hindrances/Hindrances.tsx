import { Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel, FormGroup } from "@mui/material";
import { useState } from "react";
import { Hindrance } from "../../../dtos/Hindrance.dto";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import HindranceCard from "./HindranceCard";

export default function Hindrances() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [hindrances, setHindrances] = useState<Hindrance[]>(
    wildcardData?.hindrances || []
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHindrance, setNewHindrance] = useState<Hindrance>(new Hindrance(""));

  const handleOpenDialog = () => {
    setNewHindrance(new Hindrance(""));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const updated = [...hindrances, newHindrance];
    setHindrances(updated);
    setWildcardData({ ...wildcardData, hindrances: updated });
    setDialogOpen(false);
  };

  const handleUpdate = (updatedHindrance: Hindrance) => {
    const hindranceIndex = hindrances.findIndex(
      (x) => x._id === updatedHindrance._id
    );
    const currentHindrance = hindrances;
    currentHindrance[hindranceIndex] = updatedHindrance;
    setHindrances([...currentHindrance]);
  };

  const handleDelete = (id: string) => {
    const cleanedHindrances = hindrances.filter((x) => x._id !== id);
    setHindrances([...cleanedHindrances]);
  };

  const hindranceUpdate = (event: any) => {
    const { name, value, checked } = event.target;
    setNewHindrance({
      ...newHindrance,
      [name]: name === "isMajor" ? checked : value,
    });
  };

  return (
    <Box>
      <h3>Hindrances</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {hindrances.map((hindrance) => (
          <HindranceCard
            key={`hindrance-${hindrance._id}`}
            hindrance={hindrance}
            updateHindrance={handleUpdate}
            deleteHindrance={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Hindrance" onClick={handleOpenDialog} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <FormGroup row>
            <TextField
              sx={{ width: "70%", ml: 3, mt: 2 }}
              name="name"
              id="hindrance-name"
              margin="dense"
              label="Hindrance Name"
              value={newHindrance.name}
              onChange={hindranceUpdate}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="isMajor"
                  id="isMajor"
                  checked={!!newHindrance.isMajor}
                  onChange={hindranceUpdate}
                  sx={{ ml: 4 }}
                />
              }
              label="major"
            />
          </FormGroup>
        </DialogTitle>
        <DialogContent>
          <TextField
            name="blurb"
            id="hindrance-blurb"
            margin="dense"
            label="Blurb"
            fullWidth
            value={newHindrance.blurb}
            onChange={hindranceUpdate}
            variant="standard"
          />
          <TextField
            multiline
            name="description"
            id="hindrance-description"
            margin="dense"
            label="Description"
            fullWidth
            autoComplete="off"
            value={newHindrance.description}
            onChange={hindranceUpdate}
            variant="standard"
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
