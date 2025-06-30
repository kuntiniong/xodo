# Command Documentation

This document outlines the commands for managing lists and tasks in your app. Each command is designed to be minimal yet functional, following Linux-inspired syntax.

---

## 1. Navigation Command

### `cd`
The `cd` command is used to **navigate (jump)** to a specific list by locating it via its **HTML ID**, full name, or initial.

- **Syntax**:
  ```bash
  cd <list-id>
  cd --<list-name>
  cd -<list-initial>
  ```
- **Arguments**:
  - `<list-id>`: The HTML `id` of the list you want to jump to.
  - `--<list-name>`: The full name of the list (preceded by `--`).
  - `-<list-initial>`: The first letter (initial) of the list name (preceded by `-`).

- **Examples**:
  ```bash
  cd work
  cd --work
  cd -w
  cd personal
  cd --personal
  cd -p
  cd main
  cd --main
  cd -m
  ```

- **Behavior**:
  - The app scrolls or navigates to the list with the specified HTML ID, name, or initial.
  - If the list does not exist, an error message is displayed:
    ```
    Error: List "invalid-id" does not exist.
    ```

---

## 1a. Clear Command

### `clear`
The `clear` command scrolls the app back to the very top.

- **Syntax**:
  ```bash
  clear
  ```
- **Behavior**:
  - The app scrolls smoothly to the top of the page.

---

## 2. Adding a Task

### `add` / `touch`
The `add` or `touch` command is used to **create a new task** and assign it to a specific list.

- **Syntax**:
  ```bash
  add "<task-name>" --<list-name>
  touch "<task-name>" -<list-initial>
  ```

- **Arguments**:
  - `<task-name>`: The name of the task, wrapped in double quotes.
  - `<list-name>`: The full name of the list (preceded by `--`).
  - `<list-initial>`: The first letter (initial) of the list name (preceded by `-`).

- **Examples**:
  ```bash
  add "Write blog post" --work
  touch "Buy groceries" -p
  ```

- **Behavior**:
  - The task will be added to the specified list.
  - If the `list-name` or `list-initial` is invalid, an error message is displayed:
    ```
    Error: List "invalid-list" does not exist.
    ```

---

## 3. Removing a Task

### `rm`
The `rm` command is used to **remove a task** from a specific list.

- **Syntax**:
  ```bash
  rm <task-id> --<list-name>
  rm <task-id> -<list-initial>
  ```

- **Arguments**:
  - `<task-id>`: The ID of the task to remove.
  - `<list-name>`: The full name of the list (preceded by `--`).
  - `<list-initial>`: The first letter (initial) of the list name (preceded by `-`).

- **Examples**:
  ```bash
  rm 3 --work
  rm 2 -p
  ```

- **Behavior**:
  - The task with the specified ID will be removed from the specified list.
  - If the task ID or list does not exist, an error message is displayed:
    ```
    Error: Task with ID "3" does not exist in list "work".
    ```

---

## 4. Marking a Task as Done

### `rm` with `--done` or `-d`
The `rm` command with the `--done` or `-d` flag is used to **mark a task as completed (crossed out)** in a specific list.

- **Syntax**:
  ```bash
  rm <task-id> --done --<list-name>
  rm <task-id> -d -<list-initial>
  ```

- **Arguments**:
  - `<task-id>`: The ID of the task to mark as done.
  - `--done` or `-d`: Indicates that the task should be marked as done.
  - `<list-name>`: The full name of the list (preceded by `--`).
  - `<list-initial>`: The first letter (initial) of the list name (preceded by `-`).

- **Examples**:
  ```bash
  rm 1 --done --work
  rm 4 -d -p
  ```

- **Behavior**:
  - The task with the specified ID will be marked as done in the specified list.
  - If the task ID or list does not exist, an error message is displayed:
    ```
    Error: Task with ID "1" does not exist in list "work".
    ```

---

## Error Handling Examples

### General Error Scenarios
1. **Invalid List**:
   ```bash
   cd invalid-list
   # Output: Error: List "invalid-list" does not exist.
   ```

2. **Invalid Task ID**:
   ```bash
   rm 99 --work
   # Output: Error: Task with ID "99" does not exist in list "work".
   ```

3. **Missing Task Name**:
   ```bash
   touch ""
   # Output: Error: Task name cannot be empty.
   ```

4. **Missing List Flag**:
   ```bash
   add "Write blog post"
   # Output: Error: List flag is required. Use `--<list-name>` or `-<list-initial>`.
   ```

---

## Command Summary

| Command          | Description                                   | Example                                 |
|------------------|-----------------------------------------------|-----------------------------------------|
| `cd <list-id>`   | Navigate to a specific list by its HTML ID.   | `cd work`                               |
| `cd --<list-name>` | Navigate to a specific list by its full name. | `cd --work`                             |
| `cd -<list-initial>` | Navigate to a specific list by its initial.   | `cd -w`                                 |
| `add` / `touch`  | Add a task to a specific list.                | `add "Task" --work` or `touch "Task" -w` |
| `rm <id>`        | Remove a task from a specific list.           | `rm 3 --work` or `rm 3 -w`              |
| `rm <id> --done` | Mark a task as done in a specific list.       | `rm 3 --done --work` or `rm 3 -d -w`    |

---

## Features NOT Included
- No task editing functionality.
- No bulk actions (e.g., deleting multiple tasks).
- No special characters or extended input formats. Task names must be wrapped in double quotes.

---

## How to Use This Documentation
- Follow the exact syntax for each command as described.
- Ensure list names or initials are valid when using flags.
- Use the `cd` command to jump to specific lists.


---
## Checklist
- [ ] fix timer state management issues (it stops when it auto hides in the hamburger menu)
- [ ] add dynamic metadata title for timer
- [ ] fix layout for tablet hamburger menu
- [x] add footer
- [ ] fix button ui
- [ ] refactor data storage logic with localStorage instead of cookies


