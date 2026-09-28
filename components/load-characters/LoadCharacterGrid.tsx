import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Fade,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material';
import Image from 'next/image';
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 1,
                        overflow: 'hidden',
                        flexShrink: 0,
                        bgcolor: 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {character.imageUrl ? (
                        <Image src={character.imageUrl} alt={character.name} width={60} height={60} style={{ objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            No image
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <CardContent sx={{ flex: 1, p: 0 }}>
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
                  </Box>
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
