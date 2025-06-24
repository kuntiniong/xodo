"use client";

import Masonry from "react-masonry-css";
import { TodoList } from "../components/TodoList";
import CookieViewer from "../components/CookieViewer";
import TodoBarChart from "../components/TodoBarChart";
import PomodoroTimer from "../components/PomodoroTimer";

export default function Home() {
  // Masonry breakpoints for responsive columns
  const breakpointColumnsObj = {
    default: 2,
    768: 1,
  };

  return (
    <div className="flex flex-row items-start justify-center bg-transparent text-foreground w-full mx-auto mt-16 gap-8">
      {/* Masonry columns (2/3 of layout) */}
      <div className="flex-1 min-w-0">
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex w-full gap-8"
          columnClassName="masonry-column flex flex-col gap-8"
        >
          <TodoList title="main" cookieKey="todos1" accentColor="var(--color-green-dark)"/>
          <TodoList title="admin" cookieKey="todos2" accentColor="var(--color-red-dark)" />
          <TodoList title="study" cookieKey="todos3" accentColor="var(--color-yellow-dark)"/>
          <TodoList title="work" cookieKey="todos4" accentColor="var(--color-blue-dark)"/>
          <TodoList title="side project" cookieKey="todos5" accentColor="var(--color-purple-dark)"/>
          <TodoList title="hobby" cookieKey="todos6" accentColor="var(--color-orange-dark)"/>
        </Masonry>
      </div>
      {/* CookieViewer column (1/3 of layout) */}
      <div className="flex flex-col w-[370px] max-w-full sticky top-8 h-fit gap-8">
        <PomodoroTimer />
        <TodoBarChart />
        <CookieViewer />
      </div>
    </div>
  );
}
