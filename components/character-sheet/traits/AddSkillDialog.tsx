import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { Trait } from '../../../dtos/Trait.dto';
import AddNewButton from '../AddNewButton';
import { DiceDropdown, DiceValues } from '../DiceDropdown';

export interface AddSkillDialogProps {
  addSkill: (skill: Trait) => void;
}

export const AddSkillDialog = (props: AddSkillDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newSkill, setNewSkill] = useState(new Trait('', DiceValues.untrained));

  const handleDiceUpdate = (event: React.ChangeEvent<{ value: string }>) => {
    setNewSkill({
      ...newSkill,
      dice: event.target.value,
    });
  };

  const handleSkillNameUpdate = (event: React.FocusEvent<HTMLInputElement>) => {
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

  const handleAdd = (event: React.FormEvent) => {
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
