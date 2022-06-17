import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  Button,
  CardActionArea,
  CardActions,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  IconButton,
  TextField,
} from "@mui/material";
import { Hindrance } from "../../../dtos/Hindrance.dto";
import HindranceDialog from "./HindranceDialog";
import CloseIcon from "@mui/icons-material/Close";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { Label } from "@mui/icons-material";
export interface HindraceCardProps {
  hindrance: Hindrance;
}

export default function HindranceCard(props: HindraceCardProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hindranceValue, setHindrance] = useState<Hindrance>(props.hindrance);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const hindranceUpdate = (event: any) => {
    const { name, value, checked } = event.target;
    console.log(name);
    console.log(checked);
    setHindrance({
      ...hindranceValue,
      [name]: name === "isMajor" ? checked : value,
    });
    console.log(hindranceValue);
  };

  const dialogTitle = () => {
    if (!editMode) {
      return (
        <DialogTitle>
          {`${hindranceValue.name} (${
            hindranceValue.isMajor ? "major" : "minor"
          })`}
          <IconButton>
            {hindranceValue.isMajor ? (
              <ArrowUpwardIcon />
            ) : (
              <ArrowDownwardIcon />
            )}
          </IconButton>
        </DialogTitle>
      );
    } else {
      return (
        <FormGroup>
          <TextField
            sx={{ width: "70%", m: 1 }}
            name="name"
            id="hindrance-name"
            margin="dense"
            // variant="standard"
            value={hindranceValue.name}
            onChange={hindranceUpdate}
          />
          <FormControlLabel
            control={
              <Checkbox
                name="isMajor"
                id="isMajor"
                checked={hindranceValue.isMajor ? "checked" : ""}
                onChange={hindranceUpdate}
              />
            }
            label="major?"
          />
        </FormGroup>
      );
    }
  };

  const hindranceBlurb = () => {
    if (!editMode) {
      return (
        <div>
          <Typography
            sx={{ fontStyle: "italic", fontWeight: "bold", m: 1 }}
            variant="subtitle1"
          >
            {hindranceValue.blurb}
          </Typography>
          <br />
          <Typography gutterBottom style={{ whiteSpace: "pre-line" }}>
            {hindranceValue.description}
          </Typography>
        </div>
      );
    } else {
      return (
        <div>
          <TextField
            name="blurb"
            id="hindrance-blurb"
            margin="dense"
            label="Blurb"
            fullWidth
            value={hindranceValue.blurb}
            onChange={hindranceUpdate}
            variant="standard"
          >
            {hindranceValue.blurb}
          </TextField>
          <br />
          <TextField
            multiline
            name="description"
            id="hindrance-description"
            margin="dense"
            label="Description"
            fullWidth
            autoComplete="off"
            value={hindranceValue.description}
            onChange={hindranceUpdate}
            variant="standard"
          >
            {hindranceValue.description}
          </TextField>
        </div>
      );
    }
  };

  return (
    <div>
      <Card
        sx={{
          maxWidth: 345,
          margin: 0.5,
          border: 1,
          borderRadius: 4,
        }}
        key={`hindrance-${hindranceValue.name}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              {`${hindranceValue.name} ${
                hindranceValue.isMajor ? "(major)" : ""
              }`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hindranceValue.blurb}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
      <Dialog open={open} onClose={handleClose} fullWidth>
        {dialogTitle()}
        <DialogContent>{hindranceBlurb()}</DialogContent>
        <DialogActions>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Unlock</Button>
          ) : (
            <Button onClick={() => setEditMode(false)}>Lock</Button>
          )}
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
