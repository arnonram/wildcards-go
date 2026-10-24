import { WildCardCharacter } from '../dtos/WildCardCharacter.dto';

export async function updateCharacter(wildCardData: WildCardCharacter) {
  const response = await fetch(`/api/character/${wildCardData._id?.toString()}`, {
    method: 'PUT',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(wildCardData),
  });

  if (!response.ok) {
    throw new Error(`Failed to save character (${response.status})`);
  }
}

export async function createNewCharacter() {
  const response = await fetch(`/api/character`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: JSON.stringify(new WildCardCharacter()),
  });

  if (!response.ok) {
    throw new Error(`Failed to create character (${response.status})`);
  }

  return response.json();
}
