import { deletePersonData, type Person } from './db'

export type DeleteOutcome = 'deleted' | 'delete_unconfirmed'

export async function deleteIfConfirmed(
  form: FormData,
  whoseData: () => Promise<Person | null>,
): Promise<DeleteOutcome> {
  if (form.get('confirm') !== 'yes') return 'delete_unconfirmed'
  const person = await whoseData()
  if (person) await deletePersonData(person)
  return 'deleted'
}
