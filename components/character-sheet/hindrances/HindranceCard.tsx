import { useState, useEffect, useRef } from "react";
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
  IconButton,
  TextField,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import { Hindrance } from "../../../dtos/Hindrance.dto";

export interface HindraceCardProps {
  hindrance: Hindrance;
  updateHindrance: (hindrance: Hindrance) => void;
  deleteHindrance: (id: string) => void;
}

export default function HindranceCard(props: HindraceCardProps) {
  let wasSaved: boolean = false;
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const refHindrance = useRef(props.hindrance);
  const [hindrance, setHindrance] = useState<Hindrance>(props.hindrance);

  const handleOpen = () => {
    setOpen(true);
    wasSaved = false;
  };

  const handleClose = () => {
    if (!wasSaved) {
      setHindrance(refHindrance.current);
    }
    setEditMode(false);
    setOpen(false);
  };

  const handleSave = () => {
    refHindrance.current = hindrance;
    props.updateHindrance(hindrance);
    setEditMode(false);
    wasSaved = true;
  };

  const hindranceUpdate = (event: any) => {
    const { name, value, checked } = event.target;
    setHindrance({
      ...hindrance,
      [name]: name === "isMajor" ? checked : value,
    });
  };

  const handleDelete = () => {
    props.deleteHindrance(refHindrance.current._id);
    setOpen(false);
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
            sx={{ width: "70%", ml: 3, mt: 2 }}
            name="name"
            id="hindrance-name"
            margin="dense"
            label="Hindrance Name"
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
                sx={{ ml: 4 }}
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
    <Grid item>
      <Card
        sx={{
          width: 250,
          minHeight: 85,
          margin: 0.5,
          border: 1,
          borderRadius: 4,
        }}
        id={`hindrance-card-${refHindrance.current._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {`${refHindrance.current.name} ${
                refHindrance.current.isMajor ? "(major)" : ""
              }`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {refHindrance.current.blurb}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        {dialogTitle()}
        <DialogContent>{hindranceBlurb()}</DialogContent>
        <DialogActions>
          <Button
            sx={{ background: "red", color: "black" }}
            onClick={handleDelete}
          >
            Delete
          </Button>
          {!editMode ? (
            <Button onClick={() => setEditMode(true)}>Edit</Button>
          ) : (
            <Button onClick={handleSave}>Save</Button>
          )}
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
