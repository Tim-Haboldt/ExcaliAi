import { ChatPanel } from "../chat/ChatPanel";
import { ExcalidrawCanvas } from "../excalidraw/ExcalidrawCanvas";

export function Workspace() {
    return (
        <div className="flex h-dvh w-full flex-col bg-zinc-50 dark:bg-black md:flex-row">
            <div className="min-h-0 min-w-0 flex-1">
                <ExcalidrawCanvas className="h-full w-full" />
            </div>

            <div className="h-[40dvh] w-full md:h-full md:w-[420px]">
                <ChatPanel className="h-full" />
            </div>
        </div>
    );
}
