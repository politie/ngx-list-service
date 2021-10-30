# 1.1.3

- Added `setPageSize(size: number)` method to update the page size of the list.

# 1.1.2

- Fixed issue with string sorting to ignore casing.

# 1.1.1

- HOTFIX: Remove subscriptions on destroy

# 1.1.0

- UPDATED: The `result$` observable now returns the latest value of a internal `ReplaySubject`. This means that a late subscriber to a list can get the latest emission of the `Subject` instead of having to wait for the next emit.
- Updated: This library now supports Angular 11 and 12.
