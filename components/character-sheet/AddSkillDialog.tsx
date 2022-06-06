import { DiceDropdown, DiceValues } from "./DiceDropdown";
import AddIcon from "@mui/icons-material/Add";
import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from "@mui/material";
import { Trait } from "../../dtos/Trait.dto";
import AddNewButton from "./AddNewButton";

export interface AddSkillDialogProps {
  addSkill: any;
}

export const AddSkillDialog = (props: AddSkillDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newSkill, setNewSkill] = useState(new Trait("", DiceValues.untrained));

  const handleDiceUpdate = (event: any) => {
    setNewSkill({
      ...newSkill,
      dice: event.target.value,
    });
  };

  const handleSkillNameUpdate = (event: any) => {
    setNewSkill({
      ...newSkill,
      name: event.target.value,
    });
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleAdd = (event: any) => {
    event.preventDefault();
    props.addSkill(newSkill as Trait);
    setOpen(false);
  };

  return (
    <div>
      <AddNewButton buttonText="Add skill" onClick={handleClickOpen} />
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add Skill</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            id="add-skill"
            variant="standard"
            onBlur={handleSkillNameUpdate}
          ></TextField>
          <DiceDropdown
            isSkill={true}
            traitName=""
            dice={DiceValues.untrained}
            updateChanges={handleDiceUpdate}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" onClick={handleAdd}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
