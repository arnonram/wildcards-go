import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Fade,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { CharToLoad } from '../../dtos/CharToLoad';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog';

export default function LoadCharactersGrid() {
  const router = useRouter();
  const [listOfChars, setListOfChars] = useState<CharToLoad[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CharToLoad | null>(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const response = await fetch(`/api/character`);
        const data = await response.json();
        setListOfChars(data);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, []);

  const handleOpenChar = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    router.push(`/character/${encodeURIComponent(id)}`);
  };

  const handleDeleteClick = (character: CharToLoad) => {
    setDeleteTarget(character);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await fetch(`/api/character/${deleteTarget._id}`, {
      method: 'DELETE',
      headers: { 'Content-type': 'application/json' },
    });
    setListOfChars((prev) => prev.filter((x) => x._id !== deleteTarget._id));
    setDeleteTarget(null);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (listOfChars.length === 0) {
    return (
      <>
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            border: '2px dashed',
            borderColor: 'primary.main',
            borderRadius: 2,
            opacity: 0.6,
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No characters found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new Wildcard to get started!
          </Typography>
        </Box>
        <DeleteConfirmationDialog
          open={deleteTarget !== null}
          characterName={deleteTarget?.name || ''}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      </>
    );
  }

  return (
    <>
      <Grid container spacing={3}>
        {listOfChars.map((character) => (
          <Grid item xs={12} sm={6} md={4} key={character._id}>
            <Fade in timeout={500}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 24px rgba(201, 162, 39, 0.2)',
                    borderColor: 'rgba(201, 162, 39, 0.5)',
                  },
                }}
              >
                <CardActionArea onClick={(e) => handleOpenChar(e, character._id)}>
                  <CardMedia
                    component="img"
                    height="120"
                    image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS6O694YvEuQNDxXMOr2UJqR1DLGXJUD8nAcw&usqp=CAU"
                    alt={character.name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        fontFamily: "'Cinzel', 'Georgia', 'serif'",
                        fontWeight: 600,
                      }}
                    >
                      {character.name || 'Unnamed Character'}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <Button size="small" color="error" onClick={() => handleDeleteClick(character)}>
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>
      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        characterName={deleteTarget?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
