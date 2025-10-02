import { File, FolderOpen, Download, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const EditorToolbar = () => {
  return (
    <div className="h-12 bg-[hsl(var(--toolbar-bg))] border-b border-border flex items-center justify-between px-4 gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <File className="h-4 w-4" />
          New
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <FolderOpen className="h-4 w-4" />
          Open
        </Button>
        <div className="h-6 w-px bg-border mx-2" />
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};
