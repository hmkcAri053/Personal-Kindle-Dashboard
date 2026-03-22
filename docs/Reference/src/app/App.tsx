import { TodayPanel } from "./components/TodayPanel";
import { TaskPanel } from "./components/TaskPanel";

export default function App() {
  return (
    <div
      className="size-full flex items-center justify-center"
      style={{ backgroundColor: "#e8e8e8" }}
    >
      <div
        className="flex overflow-hidden"
        style={{
          width: 800,
          height: 600,
          backgroundColor: "#fff",
          border: "1px solid #d0d0d0",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        {/* Left Column - Today */}
        <div
          className="flex flex-col"
          style={{
            width: "48%",
            borderRight: "1px solid #e0e0e0",
          }}
        >
          <TodayPanel />
        </div>

        {/* Right Column - Tasks */}
        <div className="flex flex-col" style={{ width: "52%" }}>
          <TaskPanel />
        </div>
      </div>
    </div>
  );
}
