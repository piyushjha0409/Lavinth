"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import RedocStandalone to avoid SSR issues
const RedocStandalone = dynamic(
  () => import("redoc").then((mod) => mod.RedocStandalone),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
);

interface RedocDocumentationProps {
  specUrl?: string;
  spec?: object;
  options?: Record<string, any>;
}

export default function RedocDocumentation({
  specUrl,
  spec,
  options = {},
}: RedocDocumentationProps) {
  const [error, setError] = useState<string | null>(null);

/**
 * TODO: to change the theme colors of redoc
 */
  const defaultOptions = {
    theme: {
      colors: {
        primary: {
          main: "#0f172a", // slate-900
        },
        success: {
          main: "#059669", // emerald-600
        },
        warning: {
          main: "#d97706", // amber-600
        },
        error: {
          main: "#dc2626", // red-600
        },
        text: {
          primary: "#0f172a", // slate-900
          secondary: "#64748b", // slate-500
        },
        background: {
          default: "#ffffff", // white
          paper: "#ffffff", // white
        },
        border: {
          dark: "#e2e8f0", // slate-200
          light: "#f1f5f9", // slate-100
        },
      },
      typography: {
        fontSize: "14px",
        lineHeight: "1.5",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        headings: {
          fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "600",
        },
      },
      sidebar: {
        backgroundColor: "#ffffff", // white
        textColor: "#374151", // gray-700
        activeTextColor: "#0f172a", // slate-900
        groupItems: {
          textTransform: "none",
        },
        level1Items: {
          textTransform: "none",
        },
      },
      rightPanel: {
        backgroundColor: "#f8fafc", // slate-50
        textColor: "#475569", // slate-600
      },
    },
    scrollYOffset: 0,
    hideDownloadButton: true,
    disableSearch: false,
    expandResponses: "200,201",
    jsonSampleExpandLevel: 2,
    hideSingleRequestSampleTab: true,
    showExtensions: false,
    nativeScrollbars: true,
    pathInMiddlePanel: true,
    untrustedSpec: false,
    hideSchemaPattern: false,
    expandSingleSchemaField: true,
    schemaExpansionLevel: 2,
    payloadSampleIdx: 0,
    menuToggle: true,
    ...options,
  };

  // Determine the spec source
  const specSource = spec || specUrl;

  useEffect(() => {
    if (!specSource) {
      setError("No spec or specUrl provided to RedocDocumentation");
    } else {
      setError(null);
    }
  }, [specSource]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p>Error loading API documentation</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!specSource) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <p>No API specification provided</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Add custom CSS to override Redoc's default styling
    const style = document.createElement('style');
    style.textContent = `
      .redoc-wrap {
        background: #f8fafc !important;
      }
      .menu-content {
        background: white !important;
        border-right: 1px solid #e2e8f0 !important;
      }
      .api-content {
        background: #f8fafc !important;
      }
      .redoc-summary {
        background: #f8fafc !important;
      }
      .api-info {
        background: #f8fafc !important;
      }
      .operation-wrap {
        background: white !important;
        margin: 16px !important;
        border-radius: 8px !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
      }
      .redoc-wrap h1, 
      .redoc-wrap h2, 
      .redoc-wrap h3, 
      .redoc-wrap h4, 
      .redoc-wrap h5 {
        color: #0f172a !important;
      }
      .menu-items li > label {
        color: #374151 !important;
      }
      .menu-items li > label:hover {
        color: #0f172a !important;
      }
      .menu-items li.active > label {
        color: #0f172a !important;
        font-weight: 600 !important;
      }
      .http-verb.post {
        background: #059669 !important;
      }
      .http-verb.get {
        background: #0ea5e9 !important;
      }
      .http-verb.put {
        background: #d97706 !important;
      }
      .http-verb.delete {
        background: #dc2626 !important;
      }
      
      /* Fix code samples styling with off-white background */
      .redoc-wrap .samples-panel {
        background: #fafafa !important;
      }
      .redoc-wrap .tab-panel {
        background: #fafafa !important;
      }
      .redoc-wrap .samples-panel-wrap {
        background: #fafafa !important;
      }
      .redoc-wrap .example-panel {
        background: #fafafa !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
      }
      .redoc-wrap .example-panel .example-panel-header {
        background: #f3f4f6 !important;
        border-bottom: 1px solid #e5e7eb !important;
        color: #374151 !important;
        padding: 8px 12px !important;
        font-size: 12px !important;
        font-weight: 500 !important;
      }
      .redoc-wrap .example-panel .example-panel-content {
        background: #fafafa !important;
        padding: 12px !important;
      }
      .redoc-wrap .response-samples {
        background: #fafafa !important;
      }
      .redoc-wrap .request-samples {
        background: #fafafa !important;
      }
      
      /* Style the copy button to look like a proper button */
      .redoc-wrap .example-panel .copy-button,
      .redoc-wrap .samples-panel .copy-button,
      .redoc-wrap [class*="copy"] button {
        background: #ffffff !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        padding: 6px 12px !important;
        color: #374151 !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
      }
      .redoc-wrap .example-panel .copy-button:hover,
      .redoc-wrap .samples-panel .copy-button:hover,
      .redoc-wrap [class*="copy"] button:hover {
        background: #f9fafb !important;
        border-color: #9ca3af !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
      }
      
      /* Fix code blocks within samples */
      .redoc-wrap .samples-panel pre {
        background: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 6px !important;
        color: #374151 !important;
        padding: 12px !important;
        margin: 8px 0 !important;
      }
      .redoc-wrap .samples-panel code {
        background: #f3f4f6 !important;
        color: #374151 !important;
        padding: 2px 4px !important;
        border-radius: 4px !important;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
      }
      
      /* Response status tabs styling */
      .redoc-wrap .samples-panel-wrap .tab-header {
        background: #fafafa !important;
        border-bottom: 1px solid #e5e7eb !important;
        padding: 8px 12px !important;
      }
      .redoc-wrap .samples-panel-wrap .tab-item {
        background: #f3f4f6 !important;
        border: 1px solid #e5e7eb !important;
        color: #374151 !important;
        padding: 6px 12px !important;
        border-radius: 6px 6px 0 0 !important;
        margin-right: 4px !important;
        font-weight: 500 !important;
      }
      .redoc-wrap .samples-panel-wrap .tab-item.active {
        background: #ffffff !important;
        color: #0f172a !important;
        border-bottom-color: #ffffff !important;
        font-weight: 600 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="redoc-container w-full min-h-[600px] bg-white border border-border rounded-lg overflow-hidden">
      <RedocStandalone
        spec={specSource as any}
        options={defaultOptions}
      />
    </div>
  );
}
