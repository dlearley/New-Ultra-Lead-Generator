export class PaginatedResponseDto<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
  hasMore: boolean;

  constructor(items: T[], total: number, skip: number, take: number) {
    this.items = items;
    this.total = total;
    this.skip = skip;
    this.take = take;
    this.hasMore = skip + take < total;
  }
}
