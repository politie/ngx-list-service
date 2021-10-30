import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ListService } from './list.service';
import { take } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ListResult } from '../models/list.model';

// Create a array with numbers from min to max
const range = (min: number, max: number) => [...Array(max - min + 1).keys()].map(i => i + min);

describe('ListService', () => {
  let service: ListService<any>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ListService
      ]
    });
    service = TestBed.inject(ListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a data set without pageSize', fakeAsync(() => {
    const list = range(1, 10);
    const results: ListResult<any>[] = [];

    service.result$.pipe(take(1)).subscribe(r => results.push(r));

    service.create({ list });
    tick();

    expect(results.length).toEqual(1);

    const [result] = results;

    expect(result.page.length).toEqual(list.length);
    expect(result.sorting).toEqual({ key: null, order: 'asc' });
    expect(result.pagination.listSize).toEqual(10);
    expect(result.pagination.page.current).toEqual(1);
    expect(result.pagination.page.total).toEqual(1);
    expect(result.pagination.page.size).toEqual(list.length);
    expect(result.pagination.pages.length).toEqual(1);
    expect(result.pagination.disabled.next).toEqual(true);
    expect(result.pagination.disabled.prev).toEqual(true);
  }));

  it('should give late consumers the latest data (shareReplay)', fakeAsync(() => {
    const list = range(1, 10);
    const results: ListResult<any>[] = [];

    service.create({ list });

    tick(250);

    service.result$.pipe(take(1)).subscribe(r => results.push(r));

    expect(results.length).toEqual(1);

    const [result] = results;

    expect(result.sorting).toEqual({ key: null, order: 'asc' });
    expect(result.page.length).toEqual(list.length);
    expect(result.pagination.listSize).toEqual(10);
    expect(result.pagination.page.current).toEqual(1);
    expect(result.pagination.page.total).toEqual(1);
    expect(result.pagination.page.size).toEqual(list.length);
    expect(result.pagination.pages.length).toEqual(1);
    expect(result.pagination.disabled.next).toEqual(true);
    expect(result.pagination.disabled.prev).toEqual(true);
  }));

  it('should create a data set with a observable', fakeAsync(() => {
    const spy = spyOn(service, 'update').and.callThrough();
    const list$ = new Subject<number[]>();
    const results: ListResult<any>[] = [];

    service.result$.subscribe(r => results.push(r));

    service.create({ list: list$.asObservable() });
    tick();
    expect(results.length).toEqual(0);

    list$.next(range(1, 10));
    tick();
    expect(results.length).toEqual(1);

    list$.next(range(1, 5));
    tick();
    expect(results.length).toEqual(2);

    const [initialEmit, nextEmit] = results;

    expect(initialEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(initialEmit.page.length).toEqual(10);
    expect(initialEmit.pagination.listSize).toEqual(10);
    expect(initialEmit.pagination.page.current).toEqual(1);
    expect(initialEmit.pagination.page.total).toEqual(1);
    expect(initialEmit.pagination.page.size).toEqual(10);
    expect(initialEmit.pagination.pages.length).toEqual(1);
    expect(initialEmit.pagination.disabled.next).toEqual(true);
    expect(initialEmit.pagination.disabled.prev).toEqual(true);

    expect(nextEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(nextEmit.page.length).toEqual(5);
    expect(nextEmit.pagination.listSize).toEqual(5);
    expect(nextEmit.pagination.page.current).toEqual(1);
    expect(nextEmit.pagination.page.total).toEqual(1);
    expect(nextEmit.pagination.page.size).toEqual(5);
    expect(nextEmit.pagination.pages.length).toEqual(1);
    expect(nextEmit.pagination.disabled.next).toEqual(true);
    expect(nextEmit.pagination.disabled.prev).toEqual(true);

    expect(spy).toHaveBeenCalledTimes(2);
  }));

  it('should create a data set handle page updates', fakeAsync(() => {
    const list = range(1, 10);
    const pageSize = 2;

    const results: ListResult<any>[] = [];
    service.result$.subscribe(r => results.push(r));

    service.create({ list, pageSize });
    service.nextPage();
    service.goToPage(5);

    expect(results.length).toEqual(3);
    const [initialEmit, nextPageEmit, goToPageEmit] = results;

    /* Initial chunk */
    expect(initialEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(initialEmit.page.length).toEqual(pageSize);
    expect(initialEmit.pagination.listSize).toEqual(10);
    expect(initialEmit.pagination.page.current).toEqual(1);
    expect(initialEmit.pagination.page.total).toEqual(5);
    expect(initialEmit.pagination.page.size).toEqual(pageSize);
    expect(initialEmit.pagination.pages.length).toEqual(5);
    expect(initialEmit.pagination.disabled.next).toEqual(false);
    expect(initialEmit.pagination.disabled.prev).toEqual(true);

    /* Next Page */
    expect(nextPageEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(nextPageEmit.page).toEqual([3, 4]);
    expect(nextPageEmit.pagination.page.current).toEqual(2);
    expect(nextPageEmit.pagination.disabled.next).toEqual(false);
    expect(nextPageEmit.pagination.disabled.prev).toEqual(false);

    /* Go to page */
    expect(goToPageEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(goToPageEmit.page).toEqual([9, 10]);
    expect(goToPageEmit.pagination.page.current).toEqual(5);
    expect(goToPageEmit.pagination.disabled.next).toEqual(true);
    expect(goToPageEmit.pagination.disabled.prev).toEqual(false);
  }));

  it('should handle updates to pageSize', fakeAsync(() => {
    const list = range(1, 10);
    const pageSize = 2;

    const results: ListResult<any>[] = [];
    service.result$.subscribe(r => results.push(r));

    service.create({ list, pageSize });
    service.setPageSize(4);
    service.goToPage(3);

    expect(results.length).toEqual(3);
    const [initialEmit, pageSizeEmit, goToPageEmit] = results;

    /* Initial chunk */
    expect(initialEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(initialEmit.page.length).toEqual(pageSize);
    expect(initialEmit.pagination.listSize).toEqual(10);
    expect(initialEmit.pagination.page.current).toEqual(1);
    expect(initialEmit.pagination.page.total).toEqual(5);
    expect(initialEmit.pagination.page.size).toEqual(pageSize);
    expect(initialEmit.pagination.pages.length).toEqual(5);
    expect(initialEmit.pagination.disabled.next).toEqual(false);
    expect(initialEmit.pagination.disabled.prev).toEqual(true);

    /* Next Page */
    expect(pageSizeEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(pageSizeEmit.page.length).toEqual(4);
    expect(pageSizeEmit.pagination.listSize).toEqual(10);
    expect(pageSizeEmit.pagination.page.current).toEqual(1);
    expect(pageSizeEmit.pagination.page.total).toEqual(3);
    expect(pageSizeEmit.pagination.page.size).toEqual(4);
    expect(pageSizeEmit.pagination.pages.length).toEqual(3);
    expect(pageSizeEmit.pagination.disabled.next).toEqual(false);
    expect(pageSizeEmit.pagination.disabled.prev).toEqual(true);

    /* Go to page */
    expect(goToPageEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(goToPageEmit.page).toEqual([9, 10]);
    expect(goToPageEmit.pagination.page.current).toEqual(3);
    expect(goToPageEmit.pagination.disabled.next).toEqual(true);
    expect(goToPageEmit.pagination.disabled.prev).toEqual(false);
  }));

  it('should handle filter logic', fakeAsync(() => {
    const list = range(1, 10);
    const pageSize = 4;

    const results: ListResult<any>[] = [];
    service.result$.subscribe(r => results.push(r));

    service.create({ list,  pageSize, filterFunction: (i) => (i > 5)});
    service.filter();
    service.nextPage();

    expect(results.length).toEqual(3);
    const [initialEmit, filteredEmit, nextPageEmit] = results;

    /* Filtered Emit */
    expect(filteredEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(filteredEmit.page.length).toEqual(4);
    expect(filteredEmit.page).toEqual([6, 7, 8, 9]);
    expect(filteredEmit.pagination.page.current).toEqual(1);
    expect(filteredEmit.pagination.page.total).toEqual(2);
    expect(filteredEmit.pagination.page.size).toEqual(pageSize);
    expect(filteredEmit.pagination.pages.length).toEqual(2);
    expect(filteredEmit.pagination.disabled.next).toEqual(false);
    expect(filteredEmit.pagination.disabled.prev).toEqual(true);

    /* Next page on filter */
    expect(nextPageEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(nextPageEmit.page.length).toEqual(1);
    expect(nextPageEmit.page).toEqual([10]);
    expect(nextPageEmit.pagination.listSize).toEqual(5);
    expect(nextPageEmit.pagination.page.current).toEqual(2);
    expect(nextPageEmit.pagination.page.total).toEqual(2);
    expect(nextPageEmit.pagination.page.size).toEqual(1);
    expect(nextPageEmit.pagination.pages.length).toEqual(2);
    expect(nextPageEmit.pagination.disabled.next).toEqual(true);
    expect(nextPageEmit.pagination.disabled.prev).toEqual(false);
  }));

  it('should handle sort on init', fakeAsync(() => {
    const list = [3, 1, 0, 2].map((i) => ({ id: i }));

    const results: ListResult<any>[] = [];
    service.result$.subscribe(r => results.push(r));

    service.create({
      list,
      pageSize: 2,
      sort: { key: 'id', order: 'desc' }
    });
    service.nextPage();
    service.sort('id');

    expect(results.length).toEqual(3);
    const [initialEmit, nextPageEmit, sortEmit] = results;

    expect(initialEmit.sorting).toEqual({ key: 'id', order: 'desc' });
    expect(initialEmit.page.length).toEqual(2);
    expect(initialEmit.page).toEqual([3, 2].map(i => ({ id: i })));
    expect(initialEmit.pagination.page.current).toEqual(1);
    expect(initialEmit.pagination.page.total).toEqual(2);
    expect(initialEmit.pagination.page.size).toEqual(2);
    expect(initialEmit.pagination.pages.length).toEqual(2);
    expect(initialEmit.pagination.disabled.next).toEqual(false);
    expect(initialEmit.pagination.disabled.prev).toEqual(true);

    expect(nextPageEmit.sorting).toEqual({ key: 'id', order: 'desc' });
    expect(nextPageEmit.page.length).toEqual(2);
    expect(nextPageEmit.page).toEqual([1, 0].map(i => ({ id: i })));
    expect(nextPageEmit.pagination.page.current).toEqual(2);
    expect(nextPageEmit.pagination.page.total).toEqual(2);
    expect(nextPageEmit.pagination.page.size).toEqual(2);
    expect(nextPageEmit.pagination.pages.length).toEqual(2);
    expect(nextPageEmit.pagination.disabled.next).toEqual(true);
    expect(nextPageEmit.pagination.disabled.prev).toEqual(false);

    expect(sortEmit.sorting).toEqual({ key: 'id', order: 'asc' });
    expect(sortEmit.page.length).toEqual(2);
    expect(sortEmit.page).toEqual([0, 1].map(i => ({ id: i })));
    expect(sortEmit.pagination.page.current).toEqual(1);
    expect(sortEmit.pagination.page.total).toEqual(2);
    expect(sortEmit.pagination.page.size).toEqual(2);
    expect(sortEmit.pagination.pages.length).toEqual(2);
    expect(sortEmit.pagination.disabled.next).toEqual(false);
    expect(sortEmit.pagination.disabled.prev).toEqual(true);
  }));

  it('should have a sort function in objects', fakeAsync(() => {
    const list = [3, 1, 0, 2].map((i) => ({ id: i }));

    const results: ListResult<any>[] = [];
    service.result$.subscribe(r => results.push(r));

    service.create({
      list
    });
    service.sort('id');
    service.sort('id');

    expect(results.length).toEqual(3);

    const [initialEmit, sortEmit, reverseSortEmit] = results;

    expect(sortEmit.sorting).toEqual({ key: 'id', order: 'asc' });
    expect(reverseSortEmit.pagination.page.current).toEqual(1);
    expect(sortEmit.page.length).toEqual(list.length);
    expect(sortEmit.pagination.listSize).toEqual(4);
    expect(sortEmit.page).toEqual(range(0, 3).map(i => ({ id: i })));

    expect(reverseSortEmit.sorting).toEqual({ key: 'id', order: 'desc' });
    expect(reverseSortEmit.pagination.page.current).toEqual(1);
    expect(reverseSortEmit.page.length).toEqual(list.length);
    expect(reverseSortEmit.pagination.listSize).toEqual(4);
    expect(reverseSortEmit.page).toEqual([3, 2, 1, 0].map(i => ({ id: i })));
  }));

  it('should have a sort function in objects with string values', fakeAsync(() => {
    const list = ['a', 'b', 'c', 'd', 'B'].map(i => ({ name: i }));

    const results: ListResult<any>[] = [];
    service.result$.subscribe(r => results.push(r));

    service.create({
      list
    });
    service.sort('name');
    service.sort('name');

    expect(results.length).toEqual(3);

    const [initialEmit, sortEmit, reverseSortEmit] = results;

    expect(initialEmit.sorting).toEqual({ key: null, order: 'asc' });
    expect(initialEmit.page.length).toEqual(list.length);
    expect(initialEmit.pagination.listSize).toEqual(5);
    expect(initialEmit.page).toEqual(['a', 'b', 'c', 'd', 'B'].map(i => ({ name: i })));

    expect(sortEmit.sorting).toEqual({ key: 'name', order: 'asc' });
    expect(sortEmit.page.length).toEqual(list.length);
    expect(sortEmit.pagination.listSize).toEqual(5);
    expect(sortEmit.page).toEqual(['a', 'b', 'B', 'c', 'd'].map(i => ({ name: i })));

    expect(reverseSortEmit.sorting).toEqual({ key: 'name', order: 'desc' });
    expect(reverseSortEmit.page.length).toEqual(list.length);
    expect(reverseSortEmit.pagination.listSize).toEqual(5);
    expect(reverseSortEmit.page).toEqual(['d', 'c', 'b', 'B', 'a'].map(i => ({ name: i })));
  }));

  it('should stop subscriptions on destroy', fakeAsync(() => {
    const spy = spyOn(service, 'update').and.callThrough();

    const list$ = new Subject<number[]>();
    const results: ListResult<any>[] = [];

    service.result$.subscribe(r => results.push(r));

    service.create({ list: list$.asObservable() });
    tick();
    expect(results.length).toEqual(0);

    list$.next(range(1, 10));
    tick();
    expect(results.length).toEqual(1);

    service.ngOnDestroy();
    tick();

    list$.next(range(1, 5));
    tick();

    expect(spy).toHaveBeenCalledTimes(1);
  }));
});
