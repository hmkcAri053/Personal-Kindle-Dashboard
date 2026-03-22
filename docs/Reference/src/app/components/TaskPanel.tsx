import { AlertCircle } from "lucide-react";

interface Task {
  id: number;
  title: string;
  course: string;
  courseCode: string;
  deadline: string;
  daysLeft: number;
  completed: boolean;
}

const tasks: Task[] = [
  {
    id: 1,
    title: "Calculus Midterm Review",
    course: "Calculus II",
    courseCode: "MAD3033",
    deadline: "02/23",
    daysLeft: 2,
    completed: false,
  },
  {
    id: 2,
    title: "Lab 3: Binary Tree Traversal",
    course: "Data Structures",
    courseCode: "COP3530",
    deadline: "02/21",
    daysLeft: 0,
    completed: false,
  },
  {
    id: 3,
    title: "Essay Draft v2",
    course: "English Writing",
    courseCode: "ENG2210",
    deadline: "02/24",
    daysLeft: 3,
    completed: false,
  },
  {
    id: 4,
    title: "Chapter 7 Exercises",
    course: "Probability",
    courseCode: "STA3032",
    deadline: "02/26",
    daysLeft: 5,
    completed: false,
  },
  {
    id: 5,
    title: "Group Project Proposal",
    course: "Software Engineering",
    courseCode: "CEN4010",
    deadline: "02/28",
    daysLeft: 7,
    completed: false,
  },
  {
    id: 6,
    title: "Linear Algebra HW4",
    course: "Linear Algebra",
    courseCode: "MAS3105",
    deadline: "02/25",
    daysLeft: 4,
    completed: false,
  },
  {
    id: 7,
    title: "Reading Report · Paper Review",
    course: "Academic Writing",
    courseCode: "ENC3241",
    deadline: "03/01",
    daysLeft: 8,
    completed: false,
  },
  {
    id: 8,
    title: "Lab Report · Circuit Analysis",
    course: "Physics Lab",
    courseCode: "PHY3048L",
    deadline: "02/20",
    daysLeft: -1,
    completed: true,
  },
  {
    id: 9,
    title: "Ch.5-6 Notes Summary",
    course: "Calculus II",
    courseCode: "MAD3033",
    deadline: "02/19",
    daysLeft: -2,
    completed: true,
  },
];

function getDeadlineLabel(daysLeft: number): string {
  if (daysLeft < 0) return "Done";
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Tomorrow";
  return `In ${daysLeft} days`;
}

function getDeadlineColor(daysLeft: number, completed: boolean): string {
  if (completed) return "#bbb";
  if (daysLeft <= 0) return "#000";
  if (daysLeft <= 2) return "#444";
  if (daysLeft <= 5) return "#777";
  return "#aaa";
}

export function TaskPanel() {
  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const urgentCount = pendingTasks.filter((t) => t.daysLeft <= 2).length;

  return (
    <div className="flex flex-col h-full p-5 pl-4">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-[32px] tracking-tight" style={{ color: "#000" }}>
          Tasks
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[16px]" style={{ color: "#999" }}>
            {pendingTasks.length} pending
          </span>
          {urgentCount > 0 && (
            <span
              className="text-[16px] flex items-center gap-1"
              style={{ color: "#555" }}
            >
              <AlertCircle size={15} strokeWidth={1.5} />
              {urgentCount} urgent
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div
          className="w-full h-[4px] rounded-full"
          style={{ backgroundColor: "#e8e8e8" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: "#888",
              width: `${(completedTasks.length / tasks.length) * 100}%`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[14px]" style={{ color: "#bbb" }}>
            Progress
          </span>
          <span className="text-[14px]" style={{ color: "#999" }}>
            {completedTasks.length}/{tasks.length}
          </span>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-hidden">
        {/* Pending Tasks */}
        <div className="flex flex-col">
          {pendingTasks.map((task, i) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-[6px]"
              style={{
                borderBottom:
                  i < pendingTasks.length - 1 ? "1px solid #efefef" : "none",
              }}
            >
              {/* Urgency dot */}
              <span
                className="w-[6px] h-[6px] rounded-full shrink-0"
                style={{
                  backgroundColor:
                    task.daysLeft <= 1 ? "#444" : task.daysLeft <= 3 ? "#aaa" : "#ddd",
                }}
              />
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-[16px] truncate"
                    style={{
                      color: task.daysLeft <= 1 ? "#000" : "#333",
                    }}
                  >
                    {task.title}
                  </span>
                  <span
                    className="text-[15px] shrink-0 tabular-nums"
                    style={{
                      color: getDeadlineColor(task.daysLeft, task.completed),
                    }}
                  >
                    {getDeadlineLabel(task.daysLeft)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[14px]" style={{ color: "#aaa" }}>
                    {task.courseCode} · {task.course}
                  </span>
                  <span
                    className="text-[13px] tabular-nums"
                    style={{ color: "#c0c0c0" }}
                  >
                    {task.deadline}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completed Divider */}
        {completedTasks.length > 0 && (
          <>
            <div className="flex items-center gap-2 my-2">
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: "#e8e8e8" }}
              />
              <span
                className="text-[13px] uppercase tracking-wider"
                style={{ color: "#c0c0c0" }}
              >
                Completed
              </span>
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: "#e8e8e8" }}
              />
            </div>

            <div className="flex flex-col">
              {completedTasks.map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-[4px]"
                  style={{
                    borderBottom:
                      i < completedTasks.length - 1
                        ? "1px solid #f5f5f5"
                        : "none",
                  }}
                >
                  <span
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ backgroundColor: "#ddd" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className="text-[15px] truncate line-through"
                        style={{ color: "#bbb" }}
                      >
                        {task.title}
                      </span>
                      <span
                        className="text-[13px] shrink-0"
                        style={{ color: "#d0d0d0" }}
                      >
                        {task.deadline}
                      </span>
                    </div>
                    <span className="text-[13px]" style={{ color: "#ccc" }}>
                      {task.courseCode} · {task.course}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}