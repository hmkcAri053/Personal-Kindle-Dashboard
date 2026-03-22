import {
  Cloud,
  Calendar,
  Clock,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  RefreshCw,
} from "lucide-react";

interface TimeBlockData {
  label: string;
  icon: React.ReactNode;
  task: string;
  course: string;
  courseCode: string;
  deadline: string;
  daysLeft: number;
}

const timeBlocks: TimeBlockData[] = [
  {
    label: "AM",
    icon: <Sunrise size={16} strokeWidth={1.5} />,
    task: "Calculus Review Ch.5-6",
    course: "Calculus II",
    courseCode: "MAD3033",
    deadline: "02/23",
    daysLeft: 2,
  },
  {
    label: "PM",
    icon: <Sun size={16} strokeWidth={1.5} />,
    task: "Data Structures Lab 3",
    course: "Data Structures",
    courseCode: "COP3530",
    deadline: "02/21",
    daysLeft: 0,
  },
  {
    label: "EVE",
    icon: <Sunset size={16} strokeWidth={1.5} />,
    task: "English Essay Revision",
    course: "English Writing",
    courseCode: "ENG2210",
    deadline: "02/24",
    daysLeft: 3,
  },
  {
    label: "NIT",
    icon: <Moon size={16} strokeWidth={1.5} />,
    task: "Probability Preview",
    course: "Probability",
    courseCode: "STA3032",
    deadline: "02/26",
    daysLeft: 5,
  },
];

function getDaysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `${daysLeft} days left`;
}

export function TodayPanel() {
  const today = new Date(2026, 1, 21);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = dayNames[today.getDay()];

  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const diffMs = today.getTime() - startOfYear.getTime();
  const weekNumber = Math.ceil(
    (diffMs / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7
  );

  return (
    <div className="flex flex-col h-full p-5 pr-4">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="text-[32px] tracking-tight" style={{ color: "#000" }}>
          Today
        </h1>
        <span className="text-[16px]" style={{ color: "#999" }}>
          {dayOfWeek}
        </span>
      </div>

      {/* Date & Meta Row */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="flex items-center justify-center w-[64px] h-[64px] border"
          style={{ borderColor: "#d0d0d0", backgroundColor: "#fafafa" }}
        >
          <div className="text-center">
            <div
              className="text-[13px] uppercase tracking-widest"
              style={{ color: "#888" }}
            >
              FEB
            </div>
            <div className="text-[30px] leading-none" style={{ color: "#000" }}>
              21
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Cloud size={16} strokeWidth={1.5} style={{ color: "#777" }} />
            <span className="text-[16px]" style={{ color: "#555" }}>
              Cloudy · 3°C / 8°C
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} strokeWidth={1.5} style={{ color: "#777" }} />
            <span className="text-[16px]" style={{ color: "#555" }}>
              Week {weekNumber} · 2026 Spring
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ backgroundColor: "#e0e0e0" }} />

      {/* Upcoming - single item, full info */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={15} strokeWidth={1.5} style={{ color: "#888" }} />
          <span
            className="text-[14px] uppercase tracking-wider"
            style={{ color: "#888" }}
          >
            Up Next
          </span>
        </div>
        <div
          className="border px-3 py-2.5"
          style={{ borderColor: "#d0d0d0", backgroundColor: "#f5f5f5" }}
        >
          <div className="text-[17px]" style={{ color: "#111" }}>
            Calculus Midterm Review
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[15px]" style={{ color: "#888" }}>
              MAD3033 · Calculus II
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[14px] tabular-nums" style={{ color: "#aaa" }}>
                Due 02/23
              </span>
              <span
                className="text-[14px]"
                style={{ color: "#444" }}
              >
                2 days left
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ backgroundColor: "#e0e0e0" }} />

      {/* Time Blocks - vertical stack, 1 task each */}
      <div className="flex-1 flex flex-col gap-[5px]">
        {timeBlocks.map((block, i) => (
          <div
            key={i}
            className="flex-1 border px-3 flex items-center"
            style={{
              borderColor: "#e0e0e0",
              backgroundColor: i === 0 ? "#f0f0f0" : "#fafafa",
            }}
          >
            {/* Time label - icon stacked above text */}
            <div
              className="flex flex-col items-center justify-center w-[40px] shrink-0"
              style={{ color: i === 0 ? "#333" : "#999" }}
            >
              {block.icon}
              <span className="text-[12px] mt-0.5">{block.label}</span>
            </div>

            {/* Vertical separator */}
            <div
              className="w-px self-stretch mx-3 my-2"
              style={{ backgroundColor: "#e0e0e0" }}
            />

            {/* Task info - line 1: task name + days left, line 2: courseCode */}
            <div className="flex-1 min-w-0 py-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="text-[15px] truncate"
                  style={{ color: i === 0 ? "#111" : "#444" }}
                >
                  {block.task}
                </span>
                <span
                  className="text-[13px] tabular-nums shrink-0"
                  style={{
                    color: block.daysLeft <= 1 ? "#444" : i === 0 ? "#999" : "#bbb",
                  }}
                >
                  {getDaysLeftLabel(block.daysLeft)}
                </span>
              </div>
              <span
                className="text-[13px]"
                style={{ color: i === 0 ? "#777" : "#aaa" }}
              >
                {block.courseCode}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Last Refresh */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <RefreshCw size={12} strokeWidth={1.5} style={{ color: "#c0c0c0" }} />
        <span className="text-[13px] tabular-nums" style={{ color: "#c0c0c0" }}>
          Last refresh 08:42
        </span>
      </div>
    </div>
  );
}
