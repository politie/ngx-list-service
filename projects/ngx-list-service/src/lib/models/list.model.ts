import { Observable } from 'rxjs';

/**
 * Sorting payload
 */
export type ListSorting<T> = {
  /**
   * Key to sort by, as keyof of the provided generic type T
   */
  key: (Extract<keyof T, string>) | null;

  /**
   * Order, can be 'asc' or 'desc'
   */
  order: 'asc' | 'desc';
};

/**
 * List pagination payload
 */
export type ListPagination = {
  /**
   * Size of the current sorted list
   */
  listSize: number;

  page: {
    /**
     * The current page (1-based)
     */
    current: number;
    /**
     * Items on current page
     */
    size: number;

    /**
     * Total number of pages
     */
    total: number;
  };

  /**
   * Array with pages
   */
  pages: number[];

  disabled: {
    /**
     * Should a prev button be disabled?
     */
    prev: boolean;

    /**
     * Should a next button be disabled?
     */
    next: boolean;
  };
};

export type ListResult<T> = {
  /**
   * The current slice of the list
   */
  page: T[];

  /**
   * The current sorting options
   */
  sorting: ListSorting<T>;

  /**
   * Object with pagination properties
   */
  pagination: ListPagination
};

export type ListPayload<T> = {
  /**
   * The data that should be handled by the ListService
   */
  list: T[] | Observable<T[]>;

  /**
   * Set to number of items per page / slice
   */
  pageSize?: number;

  /**
   * Initial sorting
   */
  sort?: ListSorting<T>;

  /**
   * Should the pagination return to page 1 on update?
   *
   * @deprecated
   */
  resetToFirstPageOnUpdate?: boolean;

  /**
   * Custom filter function
   */
  filterFunction?: null | ((item: T) => boolean);

  /**
   * Custom sort function
   */
  sortFunction?: null | ((item: T, property: Extract<keyof T, string>) => any);
}
