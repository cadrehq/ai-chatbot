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
import useSWR from "swr";
import { Suggestion } from "@/lib/db/schema";
import { fetcher, postRequest } from "@/lib/utils";

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
  }, [documentKey, documentTitle, documentUrl, callbackUrl, session?.user]);

  const {
    data: { token } = {},
    error: tokenError,
    isLoading: tokenLoading,
  } = useSWR(
    documentUrl ? "/api/onlyoffice/token" : null,
    (url) => postRequest<IConfig>(url, config),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  );

  const { data: suggestions = [], error: suggestionsError } = useSWR<
    Suggestion[]
  >(
    documentUrl && token ? `/api/suggestions?documentId=${documentKey}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

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

      suggestions.forEach((suggestion, index) => {
        setTimeout(() => {
          addTrackChangeEdit(
            connector,
            suggestion.originalText,
            suggestion.suggestedText,
            suggestion.description || ""
          );
        }, index * 500); // Stagger the operations
      });

      appliedSuggestionsRef.current = true;
    } catch (err) {
      console.error("Error applying suggestions:", err);
    }
  }, [suggestions, session?.user?.name]);

  useEffect(() => {
    if (
      documentReady &&
      suggestions.length > 0 &&
      !appliedSuggestionsRef.current
    ) {
      applySuggestions();
    }
  }, [documentReady, suggestions, applySuggestions]);

  const addTrackChangeEdit = (
    connector: any,
    oldText: string,
    newText: string,
    description?: string
  ) => {
    connector.executeMethod("SearchAndReplace", [
      { searchString: oldText, replaceString: newText, matchCase: true },
    ]);

    if (description) {
      connector.executeMethod("SearchNext", [
        { searchString: oldText, matchCase: true },
      ]);
      connector.executeMethod("GetAllComments", null, (comments: any[]) => {
        const exists = comments?.some(
          (c) =>
            c.Data.Text === description &&
            c.Data.UserName === (session?.user?.name ?? "Guest")
        );
        if (!exists) {
          connector.executeMethod("AddComment", [
            { Text: description, UserName: session?.user?.name ?? "Guest" },
          ]);
        }
      });
    }
  };

  const isLoading = (tokenLoading || !documentUrl) && !token;
  const hasError = tokenError || suggestionsError;

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-muted-foreground">Loading document...</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-red-500">
          Error loading document:{" "}
          {tokenError?.message || suggestionsError?.message}
        </div>
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
