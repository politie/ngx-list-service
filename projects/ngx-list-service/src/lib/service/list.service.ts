import { BehaviorSubject, combineLatest, isObservable, Observable, ReplaySubject, Subject } from 'rxjs';
import { filter, map, skip, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Injectable, OnDestroy } from '@angular/core';
import { ListPayload, ListResult, ListSorting } from '../models/list.model';

@Injectable()
export class ListService<T> implements OnDestroy {
  result$!: Observable<ListResult<T>>;

  private filterFunction$: BehaviorSubject<((item: T) => boolean) | null> = new BehaviorSubject<((item: T) => boolean) | null>(null);
  private sortOptions$: BehaviorSubject<ListSorting<T> | null> = new BehaviorSubject<ListSorting<T> | null>(null);
  private currentIndex$ = new BehaviorSubject<number>(0);
  private resultSubject$: ReplaySubject<ListResult<T>> = new ReplaySubject<ListResult<T>>(1);

  private originalList$: Subject<T[]> = new Subject<T[]>();
  private filteredList$!: Observable<T[]>;
  private sortedList$!: Observable<{ list: T[], sorting: ListSorting<T>}>;
  private destroy$ = new Subject<boolean>();

  private config: Required<ListPayload<any>> = {
    sort: { key: null, order: 'asc' },
    list: [],
    filterFunction: null,
    sortFunction: null,
    pageSize: 0,
    resetToFirstPageOnUpdate: true
  }

  constructor() {
    /**
     * Setup the observables
     */
    this.createFilteredList$();
    this.createSortedList$();
    this.createList$();

    this.result$ = this.resultSubject$.asObservable();
  }

  ngOnDestroy() {
    this.destroy$.next(true);
  }

  /**
   * Creates a List instance and generate a list of data, filtered and sorted.
   *
   * @param payload the configuration for this List instance.
   */
  create(payload: ListPayload<any>): void {
    this.config = {...this.config, ...payload} as Required<ListPayload<any>>;

    /**
     * Emit one time if a filterFunction has been found.
     */
    if (this.config.filterFunction) {
      this.filterFunction$.next(this.config.filterFunction);
    }

    if (this.config.sort) {
      this.sortOptions$.next(this.config.sort);
    }

    if (isObservable(this.config.list)) {
      this.config.list.pipe(
        takeUntil(this.destroy$)
      ).subscribe(r => this.update(r));
    } else {
      this.update(this.config.list);
    }
  }

  /**
   * Update the list with the provided data
   *
   * @param data Array with the new data
   */
  update(data: T[]) {
    this.originalList$.next(data.slice());
    this.currentIndex$.next(0);
  }

  /**
   * Filters the original list based on provided (or provided in the config) function
   *
   * @param filterFunction function to use when filtering the list
   */
  filter(filterFunction?: (item: T) => boolean) {
    this.filterFunction$.next(filterFunction ?? this.config.filterFunction);
    this.currentIndex$.next(0);
  }

  /**
   * Sort the list by provided key
   * If the current sorting key matches the provided key
   * the list is sorted in the opposite order.
   *
   * @param key the key in which the array of objects is sorted
   */
  sort(key: Extract<keyof T, string>) {
    let order: 'asc' | 'desc';

    if (key === this.sortOptions$.getValue()?.key) {
      order = this.sortOptions$.getValue()?.order === 'asc' ? 'desc' : 'asc';
    } else {
      order = 'asc';
    }


    this.sortOptions$.next({ order, key });
    this.currentIndex$.next(0);
  }

  /**
   * Create a observable that combines the original list + emits from the filterFunction$
   * observable to return a filtered list.
   */
  createFilteredList$() {
    this.filteredList$ = combineLatest([
      this.originalList$,
      this.filterFunction$
    ]).pipe(
      map(([list, filterFunction]) => {

        if (filterFunction) {
          return list.filter(filterFunction);
        } else {
          return list;
        }
      })
    );
  }

  /**
   * Create a observable that combines the filteredList$ and sortOptions$ observables and
   * return a sorted list
   */
  createSortedList$() {
    this.sortedList$ = combineLatest([
      this.filteredList$,
      this.sortOptions$.pipe(filter((i) => i !== null)) as Observable<ListSorting<T>>
    ]).pipe(
      map(([filteredList, sorting]) => {
        let list: T[];

        if (sorting.key) {
          list = filteredList.sort((a, b): number => {
            let resultA: any;
            let resultB: any;

            if (this.config.sortFunction) {
              resultA = this.config.sortFunction(a, sorting.key as string);
              resultB = this.config.sortFunction(b, sorting.key as string);
            } else {
              resultA = a[(sorting.key as Extract<keyof T, string>)];
              resultB = b[(sorting.key as Extract<keyof T, string>)];
            }

            if (sorting.order === 'asc') {
              return resultA < resultB ? -1 : resultA > resultB ? 1 : 0;
            } else if (sorting.order === 'desc') {
              return resultB < resultA ? -1 : resultB > resultA ? 1 : 0;
            } else {
              return 0;
            }
          });
        } else {
          list = filteredList;
        }

        /**
         * Return a object for the next consumer with the sorted list + sorting options in
         */
        return { list, sorting };
      }
    ));
  }

  /**
   * Create a observable by watching the currentIndex$ observable and grab the latest value from the sortedList$
   * observable and generate output (ListResult<T>) for the list$ consumers.
   */
  createList$() {
    this.currentIndex$.pipe(
      skip(1),
      withLatestFrom(this.sortedList$),
      map(([requestedIndex, { list, sorting }]) => {
        /**
         * Check the amount of pages that is needed for the given list
         */
        const totalPages = (this.config.pageSize === 0) ? 0 : Math.ceil(list.length / this.config.pageSize);

        /**
         * Check if the requested index is in bounds of the list size.
         */
        const index = Math.max(0, Math.min(requestedIndex, totalPages - 1));

        /**
         * Create a page based on the index and the pageSize
         */
        const sliceStart = index * this.config.pageSize;
        const page = (totalPages === 0) ? list.slice() : list.slice(sliceStart, (sliceStart + this.config.pageSize));

        /**
         * Return the payload to the view, with the list, sorting and pagination options
         */
        return {
          page,
          sorting,
          pagination: {
            listSize: list.length,
            page: {
              current: index + 1,
              size: page.length,
              total: Math.max(totalPages, 1)
            },
            pages: Array.from({length: Math.max(totalPages, 1)}, (_, i) => i + 1),
            disabled: {
              prev: (index === 0),
              next: (index === Math.max(totalPages - 1, 0))
            }
          }
        };
      })
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe(this.resultSubject$);
  }

  /**
   * Go to a specific page in the set
   * This will be transformed to a zero based index
   *
   * @param page the page number to go to
   */
  goToPage(page: number) {
    this.currentIndex$.next(page - 1);
  }

  /**
   * Go to the next page
   */
  nextPage() {
    this.currentIndex$.next(this.currentIndex$.getValue() + 1);
  }

  /**
   * Go to the previous page
   */
  prevPage() {
    this.currentIndex$.next(this.currentIndex$.getValue() - 1);
  }
}
