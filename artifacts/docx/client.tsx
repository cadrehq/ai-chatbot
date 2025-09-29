import {
  DocumentEditor,
  type IConfig,
} from "@onlyoffice/document-editor-react";
import { useSession } from "next-auth/react";
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

  const { data: session } = useSession();

  const config: IConfig = useMemo(
    () => ({
      document: {
        fileType: "docx",
        key: documentKey,
        title: documentTitle,
        url: documentUrl,
        permissions: { edit: false, review: true },
      },
      documentType: "word",
      editorConfig: {
        callbackUrl,
        mode: "edit",
        user: {
          id: session?.user?.id || Math.random().toString(36).substring(2, 15),
          name: session?.user?.name || "Guest",
          image: `https://avatar.vercel.sh/${session?.user?.email}`,
        },
      },
    }),
    [documentKey, documentTitle, documentUrl, callbackUrl, session?.user]
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
    <div className="h-full w-full">
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
