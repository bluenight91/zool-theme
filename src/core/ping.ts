/** Empty selection means every monitor. A click starts a comparison; clicking the last one returns to all. */
export function togglePing(picked: readonly number[], id: number): number[] {
  if (picked.length === 0) return [id]
  return picked.includes(id) ? picked.filter((item) => item !== id) : [...picked, id]
}
