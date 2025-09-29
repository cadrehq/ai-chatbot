import { DocumentEditor } from "@onlyoffice/document-editor-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

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

  const config = useMemo(
    () => ({
      document: {
        fileType: "docx",
        key: documentKey,
        title: documentTitle,
        url: documentUrl,
      },
      documentType: "word",
      editorConfig: {
        callbackUrl,
        mode: "edit",
        user: {
          id: "user-1",
          name: "User",
        },
      },
    }),
    [documentKey, documentTitle, documentUrl, callbackUrl]
  );

  useEffect(() => {
    if (!documentUrl) {
      return;
    }

    fetch("/api/onlyoffice/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
      .then((res) => res.json())
      .then((data) => {
        setToken(data.token);
        setLoading(false);
      });
  }, [documentUrl, config]);

  if (!documentUrl || loading) {
    return null;
  }

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <DocumentEditor
        config={{ ...config, token }}
        documentServerUrl={process.env.NEXT_PUBLIC_ONLY_OFFICE_SERVER_URL ?? ""}
        height="100%"
        id="docxEditor"
        width="100%"
      />
    </div>
  );
};
