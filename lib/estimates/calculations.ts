// total = sum of (quantity * unitCost * (1 + markup/100)) across line items.
// markup is a percentage (e.g. 15.00 = 15%).
type LineItemLike = { quantity: unknown; unitCost: unknown; markup: unknown };

export function computeLineTotal(quantity: number, unitCost: number, markup: number): number {
  return quantity * unitCost * (1 + markup / 100);
}

export function computeTotal(lineItems: LineItemLike[]): string {
  const total = lineItems.reduce((sum, item) => {
    return sum + computeLineTotal(Number(item.quantity), Number(item.unitCost), Number(item.markup));
  }, 0);
  return total.toFixed(2);
}
