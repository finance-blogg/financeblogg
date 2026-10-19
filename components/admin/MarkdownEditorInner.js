"use client";

import MDEditor, { commands } from "@uiw/react-md-editor/nohighlight";
import MarkdownContent from "@/components/markdown/MarkdownContent";

function snippetCommand({ name, label, title, build }) {
  return {
    name,
    keyCommand: name,
    buttonProps: { "aria-label": title, title },
    icon: <span className="px-0.5 text-[11px] font-semibold tracking-wide">{label}</span>,
    execute: (state, api) => {
      api.replaceSelection(build(state.selectedText || ""));
    },
  };
}

const keyTakeaways = snippetCommand({
  name: "key-takeaways",
  label: "Takeaways",
  title: "Insert a key takeaways box",
  build: (text) => `\n:::key-takeaways\n${text || "- First key point\n- Second key point"}\n:::\n`,
});

const callout = snippetCommand({
  name: "callout",
  label: "Callout",
  title: "Insert a labelled box (example, note, opinion, estimate, warning, verify)",
  build: (text) => `\n:::callout{type="example" title=""}\n${text || "Illustrative example. Replace with your own text."}\n:::\n`,
});

const adBreak = snippetCommand({
  name: "ad-break",
  label: "Ad break",
  title: "Insert an in-article ad position (use at most one or two per article)",
  build: () => "\n::ad-break\n",
});

const toolbar = [
  commands.title2,
  commands.title3,
  commands.divider,
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.divider,
  commands.link,
  commands.quote,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.table,
  commands.hr,
  commands.divider,
  keyTakeaways,
  callout,
  adBreak,
];

const views = [commands.codeEdit, commands.codeLive, commands.codePreview, commands.divider, commands.fullscreen];

function AdBreakPlaceholder() {
  return (
    <div className="not-prose my-8 rounded-md border border-dashed border-navy-300 bg-navy-50 px-3 py-4 text-center text-xs font-medium tracking-[0.18em] text-navy-500 uppercase">
      Ad break (shown only on the live site when AdSense is configured)
    </div>
  );
}

export default function MarkdownEditorInner({ id, value, onChange, invalid, describedBy }) {
  return (
    <div data-color-mode="light" className="cms-markdown-editor">
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        height={560}
        minHeight={320}
        preview="edit"
        commands={toolbar}
        extraCommands={views}
        visibleDragbar
        textareaProps={{
          id,
          "aria-label": "Article body (Markdown)",
          "aria-invalid": invalid || undefined,
          "aria-describedby": describedBy,
          placeholder: "Write the article. Start sections with ## headings; the title is added automatically.",
          spellCheck: true,
        }}
        components={{
          preview: (source) => (
            <div className="article-prose bg-white p-4">
              <MarkdownContent source={source} renderAdBreak={() => <AdBreakPlaceholder />} />
            </div>
          ),
        }}
      />
    </div>
  );
}
