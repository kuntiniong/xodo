"use client";

import Masonry from "react-masonry-css";
import { TodoList } from "../components/TodoList";

export default function Home() {
  // Masonry breakpoints for responsive columns
  const breakpointColumnsObj = {
    default: 2,
    768: 1,
  };

  return (
    <div className="flex items-center justify-center bg-transparent text-foreground p-4 w-full max-w-5xl mx-auto mt-6">
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="flex w-full gap-8"
        columnClassName="masonry-column flex flex-col gap-8"
      >
        <TodoList title="main" cookieKey="todos1" />
        <TodoList title="administrative" cookieKey="todos2" />
        <TodoList title="academic" cookieKey="todos3" />
        <TodoList title="work" cookieKey="todos4" />
        <TodoList title="side project" cookieKey="todos5" />
      </Masonry>
    </div>
  );
}
