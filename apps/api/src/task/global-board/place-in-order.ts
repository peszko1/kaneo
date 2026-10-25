/**
 * Personal positions to write so `taskId` sorts where it sits in `visibleIds`
 * (the lane as the user saw it after the drop). Placed tasks sort by position
 * before unplaced ones, so only the moved task changes unless it lands among
 * unplaced tasks; those above it are then placed too. When the lane shows
 * cards out of their positions, the shown cards are placed again in the order
 * shown. Tasks hidden by filters or later pages are never rewritten.
 */
export function placeInOrder(
  visibleIds: readonly string[],
  taskId: string,
  positions: ReadonlyMap<string, number>,
): Map<string, number> {
  const index = visibleIds.indexOf(taskId);
  if (index < 0) return new Map();
  if (!followsPositions(visibleIds, taskId, positions))
    return rankAsShown(visibleIds, index, positions);
  const above = visibleIds[index - 1];
  const below = visibleIds[index + 1];
  const abovePosition = above === undefined ? undefined : positions.get(above);
  const belowPosition = below === undefined ? undefined : positions.get(below);

  if (above === undefined)
    return new Map([
      [taskId, belowPosition === undefined ? 0 : belowPosition - 1],
    ]);
  if (abovePosition !== undefined)
    return new Map([
      [
        taskId,
        belowPosition === undefined
          ? abovePosition + 1
          : (abovePosition + belowPosition) / 2,
      ],
    ]);

  // Dropped below unplaced tasks: place the unplaced run above it, in order,
  // after the last placed task.
  let start = index - 1;
  while (start > 0 && !positions.has(visibleIds[start - 1] as string)) start--;
  const before =
    start > 0 ? positions.get(visibleIds[start - 1] as string) : undefined;
  let next = before === undefined ? 0 : before + 1;
  const writes = new Map<string, number>();
  for (const id of visibleIds.slice(start, index)) writes.set(id, next++);
  writes.set(taskId, next);
  return writes;
}

// A card of a project column shows in the slot of that column's first card
// by personal order, so the lane can show cards out of their own positions.
function followsPositions(
  visibleIds: readonly string[],
  taskId: string,
  positions: ReadonlyMap<string, number>,
) {
  let previous = Number.NEGATIVE_INFINITY;
  let unplacedSeen = false;
  for (const id of visibleIds) {
    if (id === taskId) continue;
    const position = positions.get(id);
    if (position === undefined) {
      unplacedSeen = true;
      continue;
    }
    if (unplacedSeen || position <= previous) return false;
    previous = position;
  }
  return true;
}

/**
 * Hands the lane's own positions out again in the order shown, so the
 * personal order matches the screen. Cards up to the dropped one and every
 * card placed before are placed; new positions follow the highest one.
 */
function rankAsShown(
  visibleIds: readonly string[],
  index: number,
  positions: ReadonlyMap<string, number>,
) {
  const lastPlaced = visibleIds.reduce(
    (last, id, at) => (positions.has(id) ? at : last),
    -1,
  );
  const placed = visibleIds.slice(0, Math.max(index, lastPlaced) + 1);
  const keys = placed
    .flatMap((id) => {
      const position = positions.get(id);
      return position === undefined ? [] : [position];
    })
    .sort((a, b) => a - b);
  let next = (keys.at(-1) ?? -1) + 1;
  while (keys.length < placed.length) keys.push(next++);

  const writes = new Map<string, number>();
  let previous = Number.NEGATIVE_INFINITY;
  placed.forEach((id, at) => {
    // Equal positions would let the tie-breakers reorder the cards.
    const position = Math.max(keys[at] as number, previous + 1e-6);
    previous = position;
    if (positions.get(id) !== position) writes.set(id, position);
  });
  return writes;
}
