/** Destination interne uniquement (aucune redirection ouverte vers un autre site). */
export function safeDestination(from: string | undefined): string {
  return from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/connexion') && !from.startsWith('/inscription') ? from : '/tableau-de-bord';
}
