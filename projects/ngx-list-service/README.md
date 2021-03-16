# ListService

Angular Library for working with lists. Includes filtering, sorting, updates and pagination. The ListService creates a [Observable](https://rxjs.dev/) stream from a provided data array.

## Installation

`npm install @politie/ngx-list-service --save`

## Usage

To use the ListService, provide it to your `@Component` decorator by adding the service into the providers array. This makes sure that a unique ListService instance is created for each component where you use the service.

Create a property called `list$`, which is of type `Observable<ListResult<T>>` and assign it in the constructor to the ListService `list$` observable.

```typescript
import { ListService, ListResult } from '@politie/ngx-list-service';
import { OnInit } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  ...,
  providers: [
    ListService
  ]
})
export class MyComponent implements OnInit {
  public listResult$: Observable<ListResult<MyType>>;

  constructor(private listService: ListService<MyType>) {
    this.listResult$ = this.listService.result$;
  }
  
  ngOnInit() {
    this.listService.create({
      list: myData,
      pageSize: 25
    });
  }
}
```

You can then call the `create` method on the ListService class to create a list.

## Methods

### `create(payload: ListPayload<T>): void`

The create method takes your list configuration and data and returns the sorted and filtered list via the list$ observable.

##### Properties for the payload object
| Property | Type | Description | Default |
| --- | :--- | --- | --- |
| list | `T[]` or `Observable<T[]>` | Array (or observable with array) of objects containing the data that should be displayed. | `[]` |
| pageSize | `number` | How many items should be returned per page? Set to `0` for no pages. | `0` |
| sort | `{key: property: Extract<keyof T, string>, order: 'asc' / 'desc' `} | If you want to sort the list on initialzation, set the sort property to the key you want to sort the list to. | `{ key: null, order: 'asc' }` |
| filterFunction | `(item: T) => boolean` | Define a custom filter function. See [Filtering the List](#filtering-the-list) for a example. | `null` |
| sortFunction | `(item: T, property: Extract<keyof T, string>) => any)` | If you want to override the default sorting behaviour, you can do so by adding your own sortFunction. See [Sorting the List](#sorting-the-list) for a example. | `null` |

### `update(payload: T[])`

Update the data list with a new set. This will return a chunk of the new data, based on the filtering and sorting options already set.

### `sort(key: Extract<keyof T, string>)`

Sorts the list by the given `key`. The sorting starts in `ascending` order. If `sort()` is called with the same key, the order is reversed.

> If pagination is active and `sort()` is called, the pagination will be reset to the first page of results.

### `filter(function?: (item: T) => boolean)`

Filter the list by the given function. If you don't provide a function, the function provided in the config will be run (if provided).

> If pagination is active and `filter()` is called, the pagination will be reset to the first page of results.

### `nextPage()`

If pagination is active, grab the next `chunk` of data and emit the result to the `result$` observable.

### `prevPage()`

If pagination is active, grab the previous `chunk` of data and emit the result to the `result$` observable.

### `goToPage(page: number)`

If pagination is active, go to the provided page and emit the new result to the `result$` observable.

> There will be a check in place for checking if the page to go to is within the bounds of the list.

## Properties

### `result$`

The result$ observable will emit a new result whenever the ListService `update()`, `sort()` or `filter()` methods are called. The `result$` observable contains the current chunk of items, the active sorting options and properties to create pagination. The object that is returned from this observable looks like this:

```typescript
{
  page: `T[]`, // The current page chunk (based on pagination and pageSize) of the filtered and sorted list
  sorting: {
    key: `Extract<keyof T, string>`,
    order: 'asc|desc'
  },
  pagination: {
    listSize: `number`, // Length of the filtered and sorted list
    page: {
      current: `number`, // The current page (1-based)
      size: `number` // Number of items in this page
      total: `number` // Total number of pages in the filtered and sorted list
    },
    pages: `number[]` // Array of page numbers (1-based) to create pages in the view
    disabled: {
      prev: `boolean`, // Should a prev button be disabled (current chunk is start of list)
      next: `boolean` // Should a next button be disabled (current chunk is end of list)
    }
  }
}
```

With the information in the object, you can create `tables`, `lists` or anything that's suited for your data. With the `pagination` object, you can create simple `next/prev` buttons for navigating the list, but also more complex solutions with page numbers.

## Filtering the list

You can define your own `filterFunction` to add your own filter logic. The function takes one parameter: the current item in the list. The function will run over every item in the provided `data[]` array when `create()` and/or `filter()` is called. Let's say we have the following type defined for our array of objects:

```typescript
type User {
  id: number;
  name: string;
  lastActive: string;
}
```

And we have hooked up a `FormControl` for searching for users by name (the `searchInput`). We can then implement our filter logic like this:

```typescript
import { OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';


const myList: User[] = [
  {
    id: 1,
    name: 'User',
    lastActive: 1613407049
  },
  ...
];

export class MyComponent implements OnInit {
  searchInput = new FormControl('');

  ngOnInit() {
    this.listService.create({
      list: myList,
      pageSize: 25,
      filterFunction: (item: User): boolean => {
        
        // If we can't find the search string in the name, we should return false
        if (!item.name.toLowerCase().includes(this.searchInput.value.toLowerCase())) {
          return false;
        }
  
        // By default, we would like to display the item
        return true;
      }
    });
  }
}
```

> You can also manually call the `filter()` with a function other than the function you provide in the configuration in `create()`. If you add a function in `filter()`, this function is now used whenever the lists filters (called when you `update()` the list. If you don't provide a function when calling `filter()`, the function in the config is used (or skipped, if you didn't provide a function in the config as well).

## Sorting the list

Sorting is done on the filtered list. You can define your own function to specify sorting. By default, the sorting logic does a `greather than` check. If you'd like to compare dates for example, you can write your own sorting logic. Define a custom sort function when you create a ListService instance:

```typescript
import { OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

export class MyComponent implements OnInit {
  searchInput = new FormControl('');

  ngOnInit() {
    this.listService.create({
      list: myList,
      pageSize: 25,
      sortFunction: (item: User, key: string): any => {
        
        // If the key to sort is 'lastActive', we should return a new Date to compare
        if (key === 'lastActive') {
          return new Date(item.lastActive);
        }
        
        // By default, just return the value of the key to the sorting function inside the Service.
        return item[key];
      }
    });
  }
}
```
