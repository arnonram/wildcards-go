import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormLabel,
  Grid,
  IconButton,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { Trait } from '../../../dtos/Trait.dto';
import { handleArrayUpdate } from '../../../helpers/array-helpers';
import { useWildcard } from '../../../helpers/context/wildcard-context';
import { DiceDropdown, type DiceValues } from '../DiceDropdown';
import { AddSkillDialog } from './AddSkillDialog';

export interface TraitsProps {
  title: string;
  isAttributes: boolean;
}

export default function Traits(props: TraitsProps) {
  const { wildcardData, setWildcardData } = useWildcard();
  const [traits, setTraits] = useState(
    props.isAttributes ? wildcardData.attributes : wildcardData.skills,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string>('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>, traitName: string) => {
    const { name, value } = event.target;
    setTraits(handleArrayUpdate(traits, traitName, name, value));
  };

  useEffect(() => {
    setWildcardData({
      ...wildcardData,
      [props.isAttributes ? 'attributes' : 'skills']: traits,
    });
  }, [traits, wildcardData, setWildcardData, props.isAttributes]);

  const addNewSkill = (newSkill: Trait) => {
    setTraits([...traits, newSkill]);
  };

  const handleDeleteClick = (skillName: string) => {
    setSkillToDelete(skillName);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    setTraits(traits.filter((skill) => skill.name !== skillToDelete));
    setDeleteDialogOpen(false);
    setSkillToDelete('');
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setSkillToDelete('');
  };

  const addTrait = (trait: Trait) => (
    <Grid item id={`trait-${trait.name}`} key={`trait-${trait.name}`}>
      <FormLabel
        sx={{
          display: 'block',
          typography: 'body',
          textTransform: 'uppercase',
          fontWeight: 'bold',
        }}
      >
        {trait.name}
      </FormLabel>
      <DiceDropdown
        dice={trait.dice as DiceValues}
        traitName={trait.name as string}
        isSkill={!props.isAttributes}
        updateChanges={handleInputChange}
      />
      <TextField
        id={`${trait.name}-mod`}
        name={'mod'}
        label={`${trait.name} mod`}
        value={traits.find((x) => x.name === trait.name)?.mod}
        onChange={(event) => handleInputChange(event, trait.name)}
      />
      {!props.isAttributes && (
        <IconButton
          id={`${trait.name}-delete`}
          color="warning"
          aria-label="delete"
          edge="start"
          onClick={() => handleDeleteClick(trait.name)}
        >
          <DeleteForeverIcon />
        </IconButton>
      )}
    </Grid>
  );

  return (
    <Box>
      <h3>{props.title}</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {traits.map((trait) => addTrait(trait))}
      </Grid>
      {!props.isAttributes && <AddSkillDialog addSkill={addNewSkill} />}

      <Dialog open={deleteDialogOpen} onClose={handleCancelDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Skill</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{skillToDelete}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
