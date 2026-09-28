import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  Button,
  CardActionArea,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Grid,
  TextField,
} from "@mui/material";
import { Hindrance } from "../../../dtos/Hindrance.dto";

export interface HindranceCardProps {
  hindrance: Hindrance;
  updateHindrance: (hindrance: Hindrance) => void;
  deleteHindrance: (id: string) => void;
}

export default function HindranceCard(props: HindranceCardProps) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Hindrance>(props.hindrance);

  useEffect(() => {
    setEditData(props.hindrance);
  }, [props.hindrance]);

  const handleOpen = () => {
    setEditData(props.hindrance);
    setOpen(true);
  };

  const handleClose = () => {
    setEditData(props.hindrance);
    setOpen(false);
  };

  const handleSave = () => {
    props.updateHindrance(editData);
    setOpen(false);
  };

  const hindranceUpdate = (event: any) => {
    const { name, value, checked } = event.target;
    setEditData({
      ...editData,
      [name]: name === "isMajor" ? checked : value,
    });
  };

  const handleDelete = () => {
    props.deleteHindrance(props.hindrance._id);
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
        id={`hindrance-card-${props.hindrance._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {`${props.hindrance.name} ${props.hindrance.isMajor ? "(major)" : ""}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.hindrance.blurb}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>
          <FormGroup row>
            <TextField
              sx={{ width: "70%", ml: 3, mt: 2 }}
              name="name"
              id="hindrance-name"
              margin="dense"
              label="Hindrance Name"
              value={editData.name}
              onChange={hindranceUpdate}
            />
            <FormControlLabel
              control={
                <Checkbox
                  name="isMajor"
                  id="isMajor"
                  checked={!!editData.isMajor}
                  onChange={hindranceUpdate}
                  sx={{ ml: 4 }}
                />
              }
              label="major?"
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
            value={editData.blurb}
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
            value={editData.description}
            onChange={hindranceUpdate}
            variant="standard"
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
