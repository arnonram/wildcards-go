import { DiceDropdown, DiceValues } from "./DiceDropdown";
import AddIcon from "@mui/icons-material/Add";
import React from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from "@mui/material";
import { Trait } from "../../dtos/Trait.dto";

export interface AddSkillDialogProps {}

export const AddSkillDialog = ({}) => {
  const [open, setOpen] = React.useState(false);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAdd = () => {
    setOpen(false);
  };

  return (
    <div>
      <Button
        startIcon={<AddIcon />}
        variant="contained"
        color="primary"
        onClick={handleClickOpen}
      >
        Add Skill
      </Button>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add Skill</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="add-skill"
            variant="standard"
          ></TextField>
          <DiceDropdown
            isSkill={true}
            trait={new Trait("", DiceValues.untrained)}
            updateChanges={() => {}}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
