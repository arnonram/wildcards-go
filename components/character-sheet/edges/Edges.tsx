import { Box, Grid, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useState } from "react";
import { Edge } from "../../../dtos/Edge";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import EdgeCard from "./EdgeCard";

export default function Edges() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [edges, setEdges] = useState<Edge[]>(wildcardData?.edges || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newEdge, setNewEdge] = useState<Edge>(new Edge(""));

  const handleOpenDialog = () => {
    setNewEdge(new Edge(""));
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const updated = [...edges, newEdge];
    setEdges(updated);
    setWildcardData({ ...wildcardData, edges: updated });
    setDialogOpen(false);
  };

  const handleUpdate = (updatedEdge: Edge) => {
    const edgeIndex = edges.findIndex((x) => x._id === updatedEdge._id);
    const currentEdges = edges;
    currentEdges[edgeIndex] = updatedEdge;
    setEdges([...currentEdges]);
  };

  const handleDelete = (id: string) => {
    const cleanedEdges = edges.filter((x) => x._id !== id);
    setEdges([...cleanedEdges]);
  };

  const edgeUpdate = (event: any) => {
    const { name, value } = event.target;
    setNewEdge({
      ...newEdge,
      [name]: value,
    });
  };

  return (
    <Box>
      <h3>Edges</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {edges.map((edge) => (
          <EdgeCard
            key={`edge-${edge._id}`}
            edge={edge}
            updateEdge={handleUpdate}
            deleteEdge={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Edge" onClick={handleOpenDialog} />

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <TextField
            sx={{ width: "70%", ml: 3, mt: 2 }}
            name="name"
            id="edge-name"
            margin="dense"
            label="Edge Name"
            value={newEdge.name}
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
            value={newEdge.requirements}
            onChange={edgeUpdate}
            variant="standard"
          />
          <TextField
            name="edgeType"
            id="edge-edgeType"
            margin="dense"
            label="Edge Type"
            fullWidth
            value={newEdge.edgeType}
            onChange={edgeUpdate}
            variant="standard"
          />
          <TextField
            name="blurb"
            id="edge-blurb"
            margin="dense"
            label="Blurb"
            fullWidth
            value={newEdge.blurb}
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
            value={newEdge.description}
            onChange={edgeUpdate}
            variant="standard"
            sx={{ mt: 3 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
