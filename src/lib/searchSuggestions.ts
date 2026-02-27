const BRAND_MODELS: Record<string, string[]> = {
  'Bottega Veneta': ['Pouch', 'Cassette', 'Jodie', 'Arco', 'Cabat', 'Intrecciato'],
  'Chanel': ['Classic Flap', '2.55', 'Boy', 'Gabrielle', '19', 'Coco Handle', 'Vanity Case'],
  'Dior': ['Lady Dior', 'Saddle', 'Book Tote', '30 Montaigne', 'Diorama', 'Miss Dior'],
  'Fendi': ['Baguette', 'Peekaboo', 'By The Way', 'Kan I', 'Mon Tresor'],
  'Givenchy': ['Antigona', 'Pandora', 'GV3', 'Cut Out'],
  'Gucci': ['Marmont', 'Dionysus', 'Jackie', 'Horsebit 1955', 'Ophidia', 'Bamboo', 'Soho Disco'],
  'Hermès': ['Birkin', 'Kelly', 'Constance', 'Evelyne', 'Picotin', 'Lindy', 'Garden Party'],
  'Loewe': ['Puzzle', 'Hammock', 'Barcelona', 'Gate', 'Flamenco'],
  'Louis Vuitton': ['Speedy', 'Neverfull', 'Pochette Metis', 'Alma', 'Capucines', 'OnTheGo', 'Twist'],
  'Prada': ['Galleria', 'Cahier', 'Cleo', 'Re-Edition 2005', 'Hobo', 'Sidonie'],
}

export const POPULAR_SUGGESTIONS: string[] = Object.entries(BRAND_MODELS)
  .sort(([a], [b]) => a.localeCompare(b))
  .flatMap(([brand, models]) => models.map(model => `${brand} ${model}`))

export function buildSuggestions(
  query: string,
  inventoryProducts: string[],
  popularItems: string[] = POPULAR_SUGGESTIONS,
): { inventory: string[]; popular: string[] } {
  const q = query.toLowerCase().trim()
  if (!q) return { inventory: [], popular: [] }

  const inventory = inventoryProducts
    .filter(name => name.toLowerCase().includes(q))
    .slice(0, 4)

  const inventoryLower = new Set(inventory.map(i => i.toLowerCase()))

  const popular = popularItems
    .filter(name => name.toLowerCase().includes(q))
    .filter(name => !inventoryLower.has(name.toLowerCase()))
    .slice(0, 4)

  return { inventory, popular }
}
