import { FileText, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

const documents = [
  { name: "Project Proposal.docx", active: false },
  { name: "Meeting Notes.docx", active: false },
  { name: "Document.docx", active: true },
  { name: "Annual Report.docx", active: false },
  { name: "Guidelines.docx", active: false },
];

export const FileSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-64 bg-[hsl(var(--sidebar-bg))] border-r border-border flex flex-col">
      <div className="p-3 border-b border-border">
        <div
          className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Documents
        </div>
      </div>
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2">
          {documents.map((doc) => (
            <div
              key={doc.name}
              className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                doc.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm truncate">{doc.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
