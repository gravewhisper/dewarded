import { deletePersonData, type Person } from './db'

export type DeleteOutcome = 'deleted' | 'delete_unconfirmed'

export async function deleteIfConfirmed(form: FormData, person: Person | null): Promise<DeleteOutcome> {
  if (form.get('confirm') !== 'yes') return 'delete_unconfirmed'
  if (person) await deletePersonData(person)
  return 'deleted'
}
