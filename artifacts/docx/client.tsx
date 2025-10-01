import {
  DocumentEditor,
  type IConfig,
} from "@onlyoffice/document-editor-react";
import { useSession } from "next-auth/react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type OnlyOfficeDocxProps = {
  documentUrl: string;
  documentKey: string;
  documentTitle: string;
  callbackUrl: string;
};

export const OnlyOfficeDocx: React.FC<OnlyOfficeDocxProps> = ({
  documentUrl,
  documentKey,
  documentTitle,
  callbackUrl,
}) => {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [documentReady, setDocumentReady] = useState(false);
  const { data: session } = useSession();
  const editorRef = useRef<any>(null);
  const appliedSuggestionsRef = useRef(false);

  const config: IConfig = useMemo(() => {
    return {
      document: {
        fileType: "docx",
        key: documentKey,
        title: documentTitle,
        url: documentUrl,
        permissions: { edit: true, review: true, comment: true },
      },
      documentType: "word",
      editorConfig: {
        callbackUrl,
        mode: "edit",
        user: {
          id: session?.user?.id || Math.random().toString(36),
          name: session?.user?.name || "Guest",
          image: `https://avatar.vercel.sh/${session?.user?.email}`,
        },
        customization: {
          review: { trackChanges: true },
        },
      },
      events: {
        onDocumentReady: () => setDocumentReady(true),
      },
    };
  }, [documentKey, documentTitle, documentUrl, callbackUrl, session]);

  const applySuggestions = useCallback(() => {
    // Prevent applying suggestions multiple times
    if (appliedSuggestionsRef.current || !suggestions.length) {
      return;
    }

    const docEditor = (window as any).DocEditor?.instances?.["docxEditor"];
    if (!docEditor) {
      console.warn("OnlyOffice editor instance not found");
      return;
    }

    try {
      const connector = docEditor.createConnector();
      editorRef.current = connector;

      console.log(`Applying ${suggestions.length} suggestions...`);

      // Use the proper OnlyOffice API to search and add comments/edits
      suggestions.forEach((suggestion, index) => {
        setTimeout(() => {
          addTrackChangeEdit(
            connector,
            suggestion.originalText,
            suggestion.suggestedText,
            suggestion.description
          );
        }, index * 500); // Stagger the operations
      });

      appliedSuggestionsRef.current = true;
    } catch (err) {
      console.error("Error applying suggestions:", err);
    }
  }, [suggestions, session?.user?.name]);

  // Fetch token for OnlyOffice
  useEffect(() => {
    if (!documentUrl || token) return;
    fetch("/api/onlyoffice/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
      .then((res) => res.json())
      .then((data) => {
        setToken(data.token);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching OnlyOffice token", err);
        setLoading(false);
      });
  }, [documentUrl, config, token]);

  // Fetch AI suggestions
  useEffect(() => {
    if (!documentUrl || token) return;
    fetch(`/api/suggestions?documentId=${documentKey}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSuggestions(data);
      })
      .catch((err) => {
        console.error("Error fetching suggestions", err);
      });
  }, [documentKey, documentUrl, token]);

  // Apply suggestions when both document is ready and suggestions are loaded
  useEffect(() => {
    if (
      documentReady &&
      suggestions.length > 0 &&
      !appliedSuggestionsRef.current
    ) {
      applySuggestions();
    }
  }, [documentReady, suggestions, applySuggestions]);

  // Add a tracked change suggestion
  const addTrackChangeEdit = (
    connector: any,
    oldText: string,
    newText: string,
    description?: string
  ) => {
    try {
      // Replace the text (this will be tracked as a change)
      connector.executeMethod("SearchAndReplace", [
        { searchString: oldText, replaceString: newText, matchCase: true },
      ]);

      // Optionally add a comment explaining the change
      if (description) {
        // Search for the oldText
        connector.executeMethod("SearchNext", [
          { searchString: oldText, matchCase: true },
        ]);
        // Get existing comments at the current selection
        connector.executeMethod("GetAllComments", null, (comments: any[]) => {
          const exists = comments?.some(
            (c) =>
              c.Text === description &&
              c.UserName === (session?.user?.name ?? "Guest")
          );
          if (!exists) {
            connector.executeMethod("AddComment", [
              { Text: description, UserName: session?.user?.name ?? "Guest" },
            ]);
          }
        });
      }
    } catch (err) {
      console.error("Error adding tracked change:", err);
    }
  };

  if ((!documentUrl || loading) && !token) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <DocumentEditor
        id="docxEditor"
        documentServerUrl={process.env.NEXT_PUBLIC_ONLY_OFFICE_SERVER_URL ?? ""}
        config={{ ...config, token }}
        height="100%"
        width="100%"
      />
    </div>
  );
};
