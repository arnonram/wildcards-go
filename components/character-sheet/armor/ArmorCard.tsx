import {
  Button,
  CardActionArea,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  TextField,
} from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import type { Armor } from '../../../dtos/Armor.dto';
import { parseArmorBonus } from '../../../helpers/armor-helpers';
import ArmorLocationSelect from './ArmorLocationSelect';

export interface ArmorCardProps {
  armor: Armor;
  updateArmor: (armor: Armor) => void;
  deleteArmor: (id: string) => void;
}

export default function ArmorCard(props: ArmorCardProps) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Armor>(props.armor);

  useEffect(() => {
    setEditData(props.armor);
  }, [props.armor]);

  const handleOpen = () => {
    setEditData(props.armor);
    setOpen(true);
  };

  const handleClose = () => {
    setEditData(props.armor);
    setOpen(false);
  };

  const handleSave = () => {
    props.updateArmor(editData);
    setOpen(false);
  };

  const armorUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditData((prev) => ({
      ...prev,
      [name]: name === 'armorBonus' ? Number(value) || 0 : value,
    }));
  };

  const handleDelete = () => {
    props.deleteArmor(props.armor._id);
    setOpen(false);
  };

  const bonus = parseArmorBonus(props.armor.armorBonus);

  return (
    <Grid item>
      <Card
        sx={{
          width: 250,
          minHeight: 85,
          margin: 0.5,
          border: 1,
          borderRadius: 4,
          opacity: props.armor.isEquipped ? 1 : 0.6,
        }}
        id={`armor-card-${props.armor._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {props.armor.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              {bonus > 0 && (
                <Chip
                  size="small"
                  label={`+${bonus}`}
                  color="primary"
                  sx={{ mr: 0.5, height: 18, fontSize: 11 }}
                />
              )}
              {props.armor.locations || 'No location'}
              {props.armor.isEquipped && ' • equipped'}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: '70%', ml: 3, mt: 2 }}
            name="name"
            id="armor-name"
            margin="dense"
            label="Armor Name"
            value={editData.name}
            onChange={armorUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <FormControlLabel
            control={
              <Checkbox
                name="isEquipped"
                id="armor-isEquipped"
                checked={!!editData.isEquipped}
                onChange={(event) =>
                  setEditData((prev) => ({ ...prev, isEquipped: event.target.checked }))
                }
              />
            }
            label="Equipped"
          />
          <TextField
            name="armorBonus"
            id="armor-armorBonus"
            margin="dense"
            label="Armor Bonus"
            fullWidth
            type="number"
            value={editData.armorBonus ?? 0}
            onChange={armorUpdate}
            variant="standard"
          />
          <ArmorLocationSelect
            id="armor-locations"
            value={editData.locations}
            onChange={(value) => setEditData((prev) => ({ ...prev, locations: value }))}
          />
          <TextField
            name="weight"
            id="armor-weight"
            margin="dense"
            label="Weight"
            fullWidth
            value={editData.weight}
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
            value={editData.cost}
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
            value={editData.comments}
            onChange={armorUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Save
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
