import { useState, useRef } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import {
  Button,
  CardActionArea,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import { Edge } from "../../../dtos/Edge";

export interface EdgeCardProps {
  edge: Edge;
  updateEdge: (edge: Edge) => void;
  deleteEdge: (id: string) => void;
}

export default function EdgeCard(props: EdgeCardProps) {
  let wasSaved: boolean = false;
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const refEdge = useRef(props.edge);
  const [edge, setEdge] = useState<Edge>(props.edge);

  const handleOpen = () => {
    setOpen(true);
    wasSaved = false;
  };

  const handleClose = () => {
    if (!wasSaved) {
      setEdge(refEdge.current);
    }
    setEditMode(false);
    setOpen(false);
  };

  const handleSave = () => {
    refEdge.current = edge;
    props.updateEdge(edge);
    setEditMode(false);
    wasSaved = true;
  };

  const edgeUpdate = (event: any) => {
    const { name, value, checked } = event.target;
    setEdge({
      ...edge,
      [name]: name === "isMajor" ? checked : value,
    });
  };

  const handleDelete = () => {
    props.deleteEdge(refEdge.current._id);
    setOpen(false);
  };

  const dialogTitle = () => {
    if (!editMode) {
      return <DialogTitle>{edge.name}</DialogTitle>;
    } else {
      return (
        <TextField
          sx={{ width: "70%", ml: 3, mt: 2 }}
          name="name"
          id="edge-name"
          margin="dense"
          label="Edge Name"
          value={edge.name}
          onChange={edgeUpdate}
        />
      );
    }
  };

  const edgeBody = () => {
    if (!editMode) {
      return (
        <div>
          <div>
            <div>
              <Typography
                sx={{ fontStyle: "italic", m: 1 }}
                variant="subtitle1"
                display="inline"
              >
                Requirements:
              </Typography>
              <Typography
                sx={{ fontWeight: "bold", m: 1 }}
                variant="subtitle1"
                display="inline"
              >
                {edge.requirements}
              </Typography>
            </div>
            <div>
              <Typography
                sx={{ fontStyle: "italic", m: 1 }}
                variant="subtitle1"
                display="inline"
              >
                Edge Type:
              </Typography>
              <Typography
                sx={{ fontWeight: "bold", m: 1 }}
                variant="subtitle1"
                display="inline"
              >
                {edge.edgeType}
              </Typography>
            </div>
          </div>
          <br />
          <Typography
            sx={{ fontStyle: "italic", fontWeight: "bold", m: 1 }}
            variant="subtitle1"
          >
            {edge.blurb}
          </Typography>
          <br />
          <Typography gutterBottom style={{ whiteSpace: "pre-line" }}>
            {edge.description}
          </Typography>
        </div>
      );
    } else {
      return (
        <div>
          <TextField
            name="requirements"
            id="edge-requirements"
            margin="dense"
            label="Requirements"
            fullWidth
            value={edge.requirements}
            onChange={edgeUpdate}
            variant="standard"
          >
            {edge.requirements}
          </TextField>
          <TextField
            name="edgeType"
            id="edge-edgeType"
            margin="dense"
            label="Edge Type"
            fullWidth
            value={edge.edgeType}
            onChange={edgeUpdate}
            variant="standard"
          >
            {edge.edgeType}
          </TextField>
          <TextField
            name="blurb"
            id="edge-blurb"
            margin="dense"
            label="Blurb"
            fullWidth
            value={edge.blurb}
            onChange={edgeUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          >
            {edge.blurb}
          </TextField>
          <TextField
            multiline
            name="description"
            id="edge-description"
            margin="dense"
            label="Description"
            fullWidth
            autoComplete="off"
            value={edge.description}
            onChange={edgeUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          >
            {edge.description}
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
        key={`edge-card-${refEdge.current.name}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {refEdge.current.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {refEdge.current.blurb}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        key={`edge-dialog-${refEdge.current.name}`}
      >
        {dialogTitle()}
        <DialogContent>{edgeBody()}</DialogContent>
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
