import type { WildCardCharacter } from '../dtos/WildCardCharacter.dto';
import { updateCharacter } from './api-actions';

export async function saveToDb(data: WildCardCharacter) {
  await updateCharacter(data);
}
