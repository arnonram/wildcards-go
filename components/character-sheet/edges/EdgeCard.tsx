import { useState, useEffect } from "react";
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
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<Edge>(props.edge);

  useEffect(() => {
    setEditData(props.edge);
  }, [props.edge]);

  const handleOpen = () => {
    setEditData(props.edge);
    setOpen(true);
  };

  const handleClose = () => {
    setEditData(props.edge);
    setOpen(false);
  };

  const handleSave = () => {
    props.updateEdge(editData);
    setOpen(false);
  };

  const edgeUpdate = (event: any) => {
    const { name, value } = event.target;
    setEditData({
      ...editData,
      [name]: value,
    });
  };

  const handleDelete = () => {
    props.deleteEdge(props.edge._id);
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
        key={`edge-card-${props.edge._id}`}
        onClick={handleOpen}
        elevation={7}
      >
        <CardActionArea>
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {props.edge.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.edge.blurb}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: "70%", ml: 3, mt: 2 }}
            name="name"
            id="edge-name"
            margin="dense"
            label="Edge Name"
            value={editData.name}
            onChange={edgeUpdate}
          />
        </DialogTitle>
        <DialogContent>
          <TextField
            name="requirements"
            id="edge-requirements"
            margin="dense"
            label="Requirements"
            fullWidth
            value={editData.requirements}
            onChange={edgeUpdate}
            variant="standard"
          />
          <TextField
            name="edgeType"
            id="edge-edgeType"
            margin="dense"
            label="Edge Type"
            fullWidth
            value={editData.edgeType}
            onChange={edgeUpdate}
            variant="standard"
          />
          <TextField
            name="blurb"
            id="edge-blurb"
            margin="dense"
            label="Blurb"
            fullWidth
            value={editData.blurb}
            onChange={edgeUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          />
          <TextField
            multiline
            name="description"
            id="edge-description"
            margin="dense"
            label="Description"
            fullWidth
            autoComplete="off"
            value={editData.description}
            onChange={edgeUpdate}
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
