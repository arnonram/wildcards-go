import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { updateCharacter } from './api-actions';

export async function saveUpdate(event: React.FormEvent, data: WildCardCharacter) {
  event.preventDefault();
  await saveToDb(data);
}

export async function saveToDb(data: WildCardCharacter) {
  await updateCharacter(data);
}
