import { create } from 'zustand';
import { TodoList, TodoItem } from '@/services/firestoreService';

export interface TodoStoreState {
  todoLists: Record<string, TodoList>;
  setTodoLists: (lists: Record<string, TodoList>) => void;
  addTodoList: (list: TodoList) => void;
  updateTodo: (listTitle: string, todo: TodoItem) => void;
  deleteTodo: (listTitle: string, todoId: string) => void;
  addTodo: (listTitle: string, todo: TodoItem) => void;
}

export const useTodoStore = create<TodoStoreState>((set) => ({
  todoLists: {},
  setTodoLists: (lists) => set({ todoLists: lists }),
  addTodoList: (list) =>
    set((state) => ({
      todoLists: { ...state.todoLists, [list.title]: list },
    })),
  updateTodo: (listTitle, updatedTodo) =>
    set((state) => {
      const list = state.todoLists[listTitle];
      if (list) {
        const updatedTodos = list.todos.map((todo) =>
          todo.id === updatedTodo.id ? updatedTodo : todo
        );
        return {
          todoLists: {
            ...state.todoLists,
            [listTitle]: { ...list, todos: updatedTodos },
          },
        };
      }
      return state;
    }),
  deleteTodo: (listTitle, todoId) =>
    set((state) => {
      const list = state.todoLists[listTitle];
      if (list) {
        const updatedTodos = list.todos.filter((todo) => todo.id !== todoId);
        return {
          todoLists: {
            ...state.todoLists,
            [listTitle]: { ...list, todos: updatedTodos },
          },
        };
      }
      return state;
    }),
  addTodo: (listTitle, newTodo) =>
    set((state) => {
      const list = state.todoLists[listTitle];
      if (list) {
        const updatedTodos = [...list.todos, newTodo];
        return {
          todoLists: {
            ...state.todoLists,
            [listTitle]: { ...list, todos: updatedTodos },
          },
        };
      }
      return state;
    }),
}));
