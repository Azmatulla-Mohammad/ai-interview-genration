import { useMemo } from "react";

const SEPARATOR_PATTERN = /^[-*_]{3,}$/;
const BULLET_PATTERN = /^(?:[-*]\s+|\u2022\s+|\d+[.)]\s+)/;

function cleanInlineText(value) {
  return String(value || "")
    .replace(/^\s*>+\s?/, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

export function FormattedText({ text, className = "" }) {
  const blocks = useMemo(() => {
    const source = String(text || "").replace(/\r/g, "");
    const nextBlocks = [];
    const lines = source.split("\n");
    let paragraphLines = [];
    let listItems = [];

    function flushParagraphs() {
      if (!paragraphLines.length) {
        return;
      }

      nextBlocks.push({
        type: "paragraph",
        content: paragraphLines.join(" "),
      });
      paragraphLines = [];
    }

    function flushList() {
      if (!listItems.length) {
        return;
      }

      nextBlocks.push({
        type: "list",
        items: listItems,
      });
      listItems = [];
    }

    lines.forEach((line) => {
      const cleaned = cleanInlineText(line);

      if (!cleaned || SEPARATOR_PATTERN.test(cleaned)) {
        flushParagraphs();
        flushList();
        return;
      }

      if (BULLET_PATTERN.test(cleaned)) {
        flushParagraphs();
        listItems.push(cleaned.replace(BULLET_PATTERN, ""));
        return;
      }

      flushList();
      paragraphLines.push(cleaned);
    });

    flushParagraphs();
    flushList();

    if (!nextBlocks.length && source.trim()) {
      nextBlocks.push({
        type: "paragraph",
        content: cleanInlineText(source),
      });
    }

    return nextBlocks;
  }, [text]);

  if (!text) {
    return null;
  }

  return (
    <div className={`formatted-copy${className ? ` ${className}` : ""}`}>
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ul key={`list-${index}`}>
            {block.items.map((item, itemIndex) => (
              <li key={`item-${itemIndex}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={`paragraph-${index}`}>{block.content}</p>
        ),
      )}
    </div>
  );
}
