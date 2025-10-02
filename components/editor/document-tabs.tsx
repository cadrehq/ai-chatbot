import { X } from "lucide-react";

const tabs = [
  { name: "Project Proposal.docx", active: false },
  { name: "Document.docx", active: true },
  { name: "Meeting Notes.docx", active: false },
];

export const DocumentTabs = () => {
  return (
    <div className="h-10 bg-[hsl(var(--tab-inactive))] border-b border-border flex items-center overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.name}
          className={`h-full flex items-center gap-2 px-4 border-r border-border cursor-pointer transition-colors ${
            tab.active
              ? "bg-[hsl(var(--tab-active))] text-foreground"
              : "text-muted-foreground hover:bg-[hsl(var(--tab-active))]/50 hover:text-foreground"
          }`}
        >
          <span className="text-sm whitespace-nowrap">{tab.name}</span>
          <X className="h-3 w-3 hover:text-destructive transition-colors" />
        </div>
      ))}
    </div>
  );
};
