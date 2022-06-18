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
  IconButton,
  TextField,
} from "@mui/material";
import { Hindrance } from "../../../dtos/Hindrance.dto";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

export interface HindraceCardProps {
  hindrance: Hindrance;
  handleExternalUpdate: any;
}

export default function HindranceCard(props: HindraceCardProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hindrance, setHindrance] = useState<Hindrance>(props.hindrance);

  useEffect(() => {
    props.handleExternalUpdate({ hindrance });
  }, [hindrance]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleLock = () => {
    props.handleExternalUpdate({ hindrance });
    setEditMode(false);
  };
  const hindranceUpdate = (event: any) => {
    const { name, value, checked } = event.target;
    console.log(name);
    console.log(checked);
    setHindrance({
      ...hindrance,
      [name]: name === "isMajor" ? checked : value,
    });
    console.log(hindrance);
  };

  const dialogTitle = () => {
    if (!editMode) {
      return (
        <DialogTitle>
          {`${hindrance.name} ${hindrance.isMajor ? "(major)" : ""}`}
          <IconButton>
            {hindrance.isMajor ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </DialogTitle>
      );
    } else {
      return (
        <FormGroup row>
          <TextField
            sx={{ width: "70%", m: 1 }}
            name="name"
            id="hindrance-name"
            margin="dense"
            // variant="standard"
            value={hindrance.name}
            onChange={hindranceUpdate}
          />
          <FormControlLabel
            control={
              <Checkbox
                name="isMajor"
                id="isMajor"
                checked={!!hindrance.isMajor}
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
            {hindrance.blurb}
          </Typography>
          <br />
          <Typography gutterBottom style={{ whiteSpace: "pre-line" }}>
            {hindrance.description}
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
            value={hindrance.blurb}
            onChange={hindranceUpdate}
            variant="standard"
          >
            {hindrance.blurb}
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
            value={hindrance.description}
            onChange={hindranceUpdate}
            variant="standard"
          >
            {hindrance.description}
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
        key={`hindrance-card-${hindrance.name}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              {`${hindrance.name} ${hindrance.isMajor ? "(major)" : ""}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hindrance.blurb}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        key={`hindrance-dialog-${hindrance.name}`}
      >
        {dialogTitle()}
        <DialogContent>{hindranceBlurb()}</DialogContent>
        <DialogActions>
          <Button sx={{ background: "red", color: "black" }}>Delete</Button>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Unlock</Button>
          ) : (
            <Button onClick={handleLock}>Lock</Button>
          )}
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
