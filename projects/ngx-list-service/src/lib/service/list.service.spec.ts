import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ListService } from './list.service';
import { skip, take } from 'rxjs/operators';
import { of, Subject } from 'rxjs';

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
    const data = range(1, 10);

    /* PrevPage */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list.length).toEqual(data.length);
      expect(r.pagination.listSize).toEqual(10);
      expect(r.pagination.page.current).toEqual(1);
      expect(r.pagination.page.total).toEqual(1);
      expect(r.pagination.page.size).toEqual(data.length);
      expect(r.pagination.pages.length).toEqual(1);
      expect(r.pagination.disabled.next).toEqual(true);
      expect(r.pagination.disabled.prev).toEqual(true);
    });
    service.create({ data });
    tick();
  }));

  it('should create a data set with a observable', fakeAsync(() => {
    const spy = spyOn(service, 'update').and.callThrough();
    const data$ = new Subject<number[]>();

    /* PrevPage */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list.length).toEqual(10);
      expect(r.pagination.listSize).toEqual(10);
      expect(r.pagination.page.current).toEqual(1);
      expect(r.pagination.page.total).toEqual(1);
      expect(r.pagination.page.size).toEqual(10);
      expect(r.pagination.pages.length).toEqual(1);
      expect(r.pagination.disabled.next).toEqual(true);
      expect(r.pagination.disabled.prev).toEqual(true);
    });

    service.create({ data: data$.asObservable() });
    tick();

    data$.next(range(1, 10));

    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list.length).toEqual(5);
      expect(r.pagination.listSize).toEqual(5);
      expect(r.pagination.page.current).toEqual(1);
      expect(r.pagination.page.total).toEqual(1);
      expect(r.pagination.page.size).toEqual(5);
      expect(r.pagination.pages.length).toEqual(1);
      expect(r.pagination.disabled.next).toEqual(true);
      expect(r.pagination.disabled.prev).toEqual(true);
    });

    data$.next(range(1, 5));

    tick();
    expect(spy).toHaveBeenCalledTimes(2);
  }));

  it('should create a data set handle page updates', fakeAsync(() => {
    const data = range(1, 10);
    const pageSize = 2;

    /* PrevPage */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list.length).toEqual(pageSize);
      expect(r.pagination.listSize).toEqual(10);
      expect(r.pagination.page.current).toEqual(1);
      expect(r.pagination.page.total).toEqual(5);
      expect(r.pagination.page.size).toEqual(pageSize);
      expect(r.pagination.pages.length).toEqual(5);
      expect(r.pagination.disabled.next).toEqual(false);
      expect(r.pagination.disabled.prev).toEqual(true);
    });
    service.create({ data, pageSize });
    tick();

    /* NextPage */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list).toEqual([3, 4]);
      expect(r.pagination.page.current).toEqual(2);
      expect(r.pagination.disabled.next).toEqual(false);
      expect(r.pagination.disabled.prev).toEqual(false);
    });
    service.nextPage();
    tick();

    /* GoToPage */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list).toEqual([9, 10]);
      expect(r.pagination.page.current).toEqual(5);
      expect(r.pagination.disabled.next).toEqual(true);
      expect(r.pagination.disabled.prev).toEqual(false);
    });
    service.goToPage(5);
    tick();
  }));

  it('should handle filter logic', fakeAsync(() => {
    const data = range(1, 10);
    const pageSize = 4;

    service.create({
      data,
      pageSize,
      filterFunction: (i) => (i > 5)
    });

    /* Filter */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list.length).toEqual(4);
      expect(r.list).toEqual([6, 7, 8, 9]);
      expect(r.pagination.page.current).toEqual(1);
      expect(r.pagination.page.total).toEqual(2);
      expect(r.pagination.page.size).toEqual(pageSize);
      expect(r.pagination.pages.length).toEqual(2);
      expect(r.pagination.disabled.next).toEqual(false);
      expect(r.pagination.disabled.prev).toEqual(true);
    });
    service.filter();
    tick();

    /* Next page on filter */
    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: null, order: 'asc' });
      expect(r.list.length).toEqual(1);
      expect(r.list).toEqual([10]);
      expect(r.pagination.listSize).toEqual(5);
      expect(r.pagination.page.current).toEqual(2);
      expect(r.pagination.page.total).toEqual(2);
      expect(r.pagination.page.size).toEqual(1);
      expect(r.pagination.pages.length).toEqual(2);
      expect(r.pagination.disabled.next).toEqual(true);
      expect(r.pagination.disabled.prev).toEqual(false);
    });
    service.nextPage();
    tick();
  }));

  it('should have a sort function in objects', fakeAsync(() => {
    const data = [
      {
        id: 3
      },
      {
        id: 1
      },
      {
        id: 0
      },
      {
        id: 2
      }
    ];

    /* PrevPage */
    service.list$.pipe(skip(1), take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: 'id', order: 'asc' });
      expect(r.list.length).toEqual(data.length);
      expect(r.pagination.listSize).toEqual(4);
      expect(r.list).toEqual([
        {
          id: 0
        },
        {
          id: 1
        },
        {
          id: 2
        },
        {
          id: 3
        }
      ]);
    });
    service.create({
      data
    });

    service.sort('id');

    tick();

    service.list$.pipe(take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: 'id', order: 'desc' });
      expect(r.list.length).toEqual(data.length);
      expect(r.pagination.listSize).toEqual(4);
      expect(r.list).toEqual([
        {
          id: 3
        },
        {
          id: 2
        },
        {
          id: 1
        },
        {
          id: 0
        }
      ]);
    });

    service.sort('id');

    tick();
  }));

  it('should have a sort function in objects with string values', fakeAsync(() => {
    const data = [
      {
        name: 'a'
      },
      {
        name: 'd'
      },
      {
        name: 'c'
      },
      {
        name: 'b'
      }
    ];

    /* PrevPage */
    service.list$.pipe(skip(1), take(1)).subscribe((r) => {
      expect(r.sorting).toEqual({ key: 'name', order: 'asc' });
      expect(r.list.length).toEqual(data.length);
      expect(r.pagination.listSize).toEqual(4);
      expect(r.list).toEqual([
        {
          name: 'a'
        },
        {
          name: 'b'
        },
        {
          name: 'c'
        },
        {
          name: 'd'
        }
      ]);
    });
    service.create({
      data
    });

    service.sort('name');

    tick();
  }));

});
