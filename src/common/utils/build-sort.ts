import { SortOrder } from '../enums';

export const buildSort = (
  sortBy?: string,
  sortOrder?: SortOrder,
  allowedFields: string[] = [],
): Record<string, 1 | -1> => {
  if (sortBy && allowedFields.includes(sortBy)) {
    return { [sortBy]: sortOrder === SortOrder.Asc ? 1 : -1 };
  }
  return { createdAt: -1 };
};
