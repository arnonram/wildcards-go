import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useState } from 'react';
import CharacterSheet from '../../components/character-sheet/CharacterSheet';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function Character({ character }: { character: Record<string, unknown> }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    await fetch(`/api/character/${character._id}`, {
      method: 'DELETE',
      headers: { 'Content-type': 'application/json' },
    });
    setDeleteDialogOpen(false);
    router.push('/');
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontFamily: "'Cinzel', 'Georgia', 'serif'",
            fontWeight: 600,
            color: 'text.primary',
          }}
        >
          {character.name || 'Unnamed Character'}
        </Typography>
        <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>
          Delete
        </Button>
      </Box>

      <CharacterSheet wildCard={character} />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Character</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{character.name || 'this character'}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export async function getStaticPaths() {
  const response = await fetch(`${API_BASE}/api/character`, {
    method: 'GET',
    headers: { 'Content-type': 'application/json' },
  });
  const characters = await response.json();

  const paths = characters.map((char: Record<string, unknown>) => ({
    params: { characterId: char._id },
  }));
  return { paths, fallback: false };
}

export async function getStaticProps({ params }: { params: { characterId: string } }) {
  const res = await fetch(`${API_BASE}/api/character/${params.characterId}`);
  const character = await res.json();
  return { props: { character } };
}
