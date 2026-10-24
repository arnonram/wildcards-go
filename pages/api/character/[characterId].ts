import type { NextApiRequest, NextApiResponse } from 'next';
import { Collections, DbActions } from '../../../helpers/db-actions';

function ensureIds(character: Record<string, unknown> | null) {
  if (!character) return character;
  const idFields = ['weapons', 'powers', 'gear', 'armors', 'edges', 'hindrances'];
  for (const field of idFields) {
    if (Array.isArray(character[field])) {
      character[field] = (character[field] as Record<string, unknown>[]).map((item) => ({
        ...item,
        _id: item._id || crypto.randomUUID().replaceAll('-', ''),
      }));
    }
  }
  return character;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawId = req.query.characterId;
  const characterId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!characterId) {
    res.status(400).json({ message: 'Missing character id' });
    return;
  }

  const dbActions = new DbActions();

  switch (req.method) {
    case 'GET': {
      console.info(`getting charachter with ID: ${characterId}`);
      const getCharacterRes = await dbActions.getById(Collections.Characters, characterId);
      res.status(200).json(ensureIds(getCharacterRes as Record<string, unknown> | null));
      break;
    }
    case 'PUT': {
      const updatedData = req.body;
      console.info(`updating charachter with ID: ${characterId}`);
      const updateCharacterRes = await dbActions.updateById(
        Collections.Characters,
        characterId,
        updatedData,
      );
      res.status(200).json(
        updateCharacterRes
          ? {
              message: `character with ID: ${characterId} updated successfully`,
            }
          : {
              message: `character with ID: ${characterId} has nothing new to update`,
            },
      );
      break;
    }
    case 'DELETE':
      console.info(`deleting charachter with ID: ${characterId}`);
      await dbActions.deleteById(Collections.Characters, characterId);
      res.status(200).json({ message: `character with ID: ${characterId} was deleted` });
      break;
  }
}
