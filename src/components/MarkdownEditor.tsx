import { useMemo, useRef, useState } from "react";
import { Button, Input, Space } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";

type MdAction = {
  key: string;
  label: string;
  wrap?: [string, string];
  linePrefix?: string;
  placeholder?: string;
};

type MarkdownEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const renderMarkdown = (text: string): string => {
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let inUl = false;

  const closeUl = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("```")) {
      closeUl();
      if (!inCodeBlock) out.push("<pre><code>");
      else out.push("</code></pre>");
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      out.push(`${line}\n`);
      continue;
    }
    if (!line.trim()) {
      closeUl();
      out.push("<br />");
      continue;
    }
    if (line.startsWith("### ")) {
      closeUl();
      out.push(`<h3>${line.slice(4)}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeUl();
      out.push(`<h2>${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeUl();
      out.push(`<h1>${line.slice(2)}</h1>`);
      continue;
    }
    if (line.startsWith("> ")) {
      closeUl();
      out.push(`<blockquote>${line.slice(2)}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${line.replace(/^[-*]\s+/, "")}</li>`);
      continue;
    }
    closeUl();
    out.push(`<p>${line}</p>`);
  }
  closeUl();

  return out
    .join("")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .replace(
      /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
    );
};

const mdActions: MdAction[] = [
  { key: "h2", label: "H2", linePrefix: "## ", placeholder: "二级标题" },
  { key: "bold", label: "加粗", wrap: ["**", "**"], placeholder: "加粗文本" },
  { key: "italic", label: "斜体", wrap: ["*", "*"], placeholder: "斜体文本" },
  { key: "quote", label: "引用", linePrefix: "> ", placeholder: "引用内容" },
  { key: "code", label: "代码", wrap: ["`", "`"], placeholder: "code" },
  {
    key: "link",
    label: "链接",
    wrap: ["[链接文本](", ")"],
    placeholder: "https://example.com",
  },
  { key: "ul", label: "列表", linePrefix: "- ", placeholder: "列表项" },
];

export const MarkdownEditor = ({
  value = "",
  onChange,
  maxLength = 20000,
  rows = 12,
  placeholder = "请输入 Markdown 内容",
}: MarkdownEditorProps) => {
  const editorRef = useRef<TextAreaRef | null>(null);
  const [internalValue, setInternalValue] = useState(value);
  const mergedValue = value ?? internalValue;

  const html = useMemo(() => renderMarkdown(mergedValue), [mergedValue]);

  const emitChange = (next: string) => {
    setInternalValue(next);
    onChange?.(next);
  };

  const applyMdAction = (action: MdAction) => {
    const editor = editorRef.current;
    const textarea = editor?.resizableTextArea?.textArea ?? null;
    const origin = mergedValue || "";
    if (!textarea) {
      let fallback = origin;
      if (action.wrap) {
        fallback += `${action.wrap[0]}${action.placeholder || ""}${action.wrap[1]}`;
      } else if (action.linePrefix) {
        fallback += `${action.linePrefix}${action.placeholder || ""}`;
      }
      emitChange(fallback);
      return;
    }

    const start = textarea.selectionStart ?? origin.length;
    const end = textarea.selectionEnd ?? origin.length;
    const selected = origin.slice(start, end) || action.placeholder || "";
    let injected = selected;

    if (action.wrap) {
      injected = `${action.wrap[0]}${selected}${action.wrap[1]}`;
    } else if (action.linePrefix) {
      injected = selected
        .split("\n")
        .map((line: string) => `${action.linePrefix}${line || action.placeholder || ""}`)
        .join("\n");
    }

    const next = `${origin.slice(0, start)}${injected}${origin.slice(end)}`;
    emitChange(next);
    setTimeout(() => {
      editor?.focus();
      const cursor = start + injected.length;
      textarea.setSelectionRange(cursor, cursor);
    }, 0);
  };

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        {mdActions.map((action) => (
          <Button key={action.key} size="small" onClick={() => applyMdAction(action)}>
            {action.label}
          </Button>
        ))}
      </Space>
      <Input.TextArea
        ref={editorRef}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        showCount
        value={mergedValue}
        onChange={(e) => emitChange(e.target.value)}
      />
      <div
        style={{
          marginTop: 12,
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          padding: 12,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 500, marginBottom: 8 }}>Markdown 预览</div>
        <div
          style={{ minHeight: 80, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
};

export default MarkdownEditor;
