# 1.1.0

- UPDATED: The `result$` observable now returns the latest value of a internal `ReplaySubject`. This means that a late subscriber to a list can get the latest emission of the `Subject` instead of having to wait for the next emit.
- Updated: This library now supports Angular 11 and 12.
