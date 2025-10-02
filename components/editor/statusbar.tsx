export const StatusBar = () => {
  return (
    <div className="h-6 bg-[hsl(var(--status-bar))] border-t border-border flex items-center px-4 text-xs text-muted-foreground">
      <div className="flex gap-4">
        <span>Document.docx</span>
        <span>•</span>
        <span>Page 1 of 3</span>
        <span>•</span>
        <span>1,247 words</span>
        <span>•</span>
        <span>Modified 2 minutes ago</span>
      </div>
      <div className="ml-auto flex gap-4">
        <span>100%</span>
        <span>•</span>
        <span>English (US)</span>
      </div>
    </div>
  );
};
