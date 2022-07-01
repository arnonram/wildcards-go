import { Box, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { Edge } from "../../../dtos/Edge";
import { useWildcard } from "../../../helpers/context/wildcard-context";
import AddNewButton from "../AddNewButton";
import HindranceCard from "./EdgeCard";

export default function Edges() {
  const { wildcardData, setWildcardData } = useWildcard();
  const [edges, setEdges] = useState<Edge[]>(wildcardData?.edges || []);

  useEffect(() => {
    setWildcardData({ ...wildcardData, edges });
  }, [edges]);

  const addEdge = (): void => {
    setEdges([...edges, new Edge("New Edge")]);
  };

  const handleUpdate = (updateEsge: Edge) => {
    const edgeIndex = edges.findIndex((x) => x._id === updateEsge._id);
    const currentEdges = edges;
    currentEdges[edgeIndex] = updateEsge;
    setEdges([...currentEdges]);
  };

  const handleDelete = (id: string) => {
    const cleanedEdges = edges.filter((x) => x._id !== id);
    setEdges([...cleanedEdges]);
  };

  return (
    <Box>
      <h3>Edges</h3>
      <Grid container rowSpacing={1} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
        {edges.map((edge) => (
          <HindranceCard
            key={`edge-${edge._id}`}
            edge={edge}
            updateEdge={handleUpdate}
            deleteEdge={handleDelete}
          />
        ))}
      </Grid>
      <AddNewButton buttonText="Add Edge" onClick={addEdge} />
    </Box>
  );
}
