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
import type { Power } from '../../../dtos/Power.dto';

export interface PowerCardProps {
  power: Power;
  updatePower: (power: Power) => void;
  deletePower: (id: string) => void;
}

export default function PowerCard(props: PowerCardProps) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Power>(props.power);

  useEffect(() => {
    setEditData(props.power);
  }, [props.power]);

  const handleOpen = () => {
    setEditData(props.power);
    setOpen(true);
  };

  const handleClose = () => {
    setEditData(props.power);
    setOpen(false);
  };

  const handleSave = () => {
    props.updatePower(editData);
    setOpen(false);
  };

  const powerUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEditData({
      ...editData,
      [name]: value,
    });
  };

  const handleDelete = () => {
    props.deletePower(props.power._id);
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
        id={`power-card-${props.power._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {props.power.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.power.pp ? `${props.power.pp} PP` : ''}
              {props.power.range ? ` — ${props.power.range}` : ''}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: '70%', ml: 3, mt: 2 }}
            name="name"
            id="power-name"
            margin="dense"
            label="Power Name"
            value={editData.name}
            onChange={powerUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            name="pp"
            id="power-pp"
            margin="dense"
            label="Power Points"
            fullWidth
            value={editData.pp}
            onChange={powerUpdate}
            variant="standard"
          />
          <TextField
            name="range"
            id="power-range"
            margin="dense"
            label="Range"
            fullWidth
            value={editData.range}
            onChange={powerUpdate}
            variant="standard"
          />
          <TextField
            name="duration"
            id="power-duration"
            margin="dense"
            label="Duration"
            fullWidth
            value={editData.duration}
            onChange={powerUpdate}
            variant="standard"
            type="number"
          />
          <TextField
            multiline
            name="effect"
            id="power-effect"
            margin="dense"
            label="Effect"
            fullWidth
            autoComplete="off"
            value={editData.effect}
            onChange={powerUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          />
          <TextField
            multiline
            name="comments"
            id="power-comments"
            margin="dense"
            label="Comments"
            fullWidth
            autoComplete="off"
            value={editData.comments}
            onChange={powerUpdate}
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
