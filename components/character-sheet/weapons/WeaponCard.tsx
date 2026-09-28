import {
  Button,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import type { Weapon } from '../../../dtos/Weapon.dto';

export interface WeaponCardProps {
  weapon: Weapon;
  updateWeapon: (weapon: Weapon) => void;
  deleteWeapon: (id: string) => void;
}

export default function WeaponCard(props: WeaponCardProps) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Weapon>(props.weapon);

  useEffect(() => {
    setEditData(props.weapon);
  }, [props.weapon]);

  const handleOpen = () => {
    setEditData(props.weapon);
    setOpen(true);
  };

  const handleClose = () => {
    setEditData(props.weapon);
    setOpen(false);
  };

  const handleSave = () => {
    props.updateWeapon(editData);
    setOpen(false);
  };

  const weaponUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditData({
      ...editData,
      [name]: value,
    });
  };

  const handleDelete = () => {
    props.deleteWeapon(props.weapon._id);
    setOpen(false);
  };

  return (
    <Grid item>
      <Card
        sx={{
          width: 250,
          minHeight: 85,
          margin: 0.5,
          border: 1,
          borderRadius: 4,
        }}
        id={`weapon-card-${props.weapon._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {props.weapon.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.weapon.damage ? `${props.weapon.damage}` : ''}
              {props.weapon.range ? ` — ${props.weapon.range}` : ''}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: '70%', ml: 3, mt: 2 }}
            name="name"
            id="weapon-name"
            margin="dense"
            label="Weapon Name"
            value={editData.name}
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
            value={editData.damage}
            onChange={weaponUpdate}
            variant="standard"
          />
          <TextField
            name="range"
            id="weapon-range"
            margin="dense"
            label="Range"
            fullWidth
            value={editData.range}
            onChange={weaponUpdate}
            variant="standard"
          />
          <TextField
            name="ap"
            id="weapon-ap"
            margin="dense"
            label="AP"
            fullWidth
            value={editData.ap}
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
            value={editData.rof}
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
            value={editData.shots}
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
            value={editData.ammo}
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
            value={editData.minStr}
            onChange={weaponUpdate}
            variant="standard"
          />
          <TextField
            name="weight"
            id="weapon-weight"
            margin="dense"
            label="Weight"
            fullWidth
            value={editData.weight}
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
            value={editData.comments}
            onChange={weaponUpdate}
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
