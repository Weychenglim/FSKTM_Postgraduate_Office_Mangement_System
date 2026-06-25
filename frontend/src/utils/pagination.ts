export const totalPagesFor = (totalItems: number, pageSize: number) =>
  Math.max(1, Math.ceil(totalItems / pageSize));

export const clampPage = (page: number, totalItems: number, pageSize: number) =>
  Math.min(Math.max(1, page), totalPagesFor(totalItems, pageSize));

export const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const safePage = clampPage(page, items.length, pageSize);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};

export const paginationRange = (page: number, totalItems: number, pageSize: number) => {
  const safePage = clampPage(page, totalItems, pageSize);
  return {
    start: totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1,
    end: Math.min(safePage * pageSize, totalItems),
    total: totalItems,
    totalPages: totalPagesFor(totalItems, pageSize),
  };
};
