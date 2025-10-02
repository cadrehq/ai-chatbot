"use client";
import React from "react";

import { DocumentTabs } from "@/components/editor/document-tabs";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { FileSidebar } from "@/components/editor/file-sidebar";
import { StatusBar } from "@/components/editor/statusbar";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";

const EditorPage = () => {
  const [showAIChat, setShowAIChat] = React.useState(false);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <EditorToolbar />

      <div className="flex-1 flex overflow-hidden">
        <FileSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <DocumentTabs />

          <div className="flex-1 flex overflow-hidden">
            {/* <OnlyOfficeEditor /> */}

            {!showAIChat && (
              <Button
                onClick={() => setShowAIChat(true)}
                className="fixed bottom-6 bg-secondary text-white right-6 h-12 w-12 rounded-full shadow-lg"
                size="sm"
              >
                <Bot className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* {showAIChat && <AIChat onClose={() => setShowAIChat(false)} />} */}
      </div>

      <StatusBar />
    </div>
  );
};

export default EditorPage;
