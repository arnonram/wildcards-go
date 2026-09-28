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
import type { Gear } from '../../../dtos/Gear.dto';

export interface GearCardProps {
  gear: Gear;
  updateGear: (gear: Gear) => void;
  deleteGear: (id: string) => void;
}

export default function GearCard(props: GearCardProps) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Gear>(props.gear);

  useEffect(() => {
    setEditData(props.gear);
  }, [props.gear]);

  const handleOpen = () => {
    setEditData(props.gear);
    setOpen(true);
  };

  const handleClose = () => {
    setEditData(props.gear);
    setOpen(false);
  };

  const handleSave = () => {
    props.updateGear(editData);
    setOpen(false);
  };

  const gearUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditData({
      ...editData,
      [name]: value,
    });
  };

  const handleDelete = () => {
    props.deleteGear(props.gear._id);
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
        id={`gear-card-${props.gear._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {props.gear.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.gear.weight ? `${props.gear.weight} lbs` : ''}
              {props.gear.cost ? ` — $${props.gear.cost}` : ''}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: '70%', ml: 3, mt: 2 }}
            name="name"
            id="gear-name"
            margin="dense"
            label="Gear Name"
            value={editData.name}
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
            value={editData.weight}
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
            value={editData.cost}
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
            value={editData.details}
            onChange={gearUpdate}
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
