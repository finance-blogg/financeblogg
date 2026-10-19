import { visit } from "unist-util-visit";

/**
 * Turns the few supported directives into marked <div>s that the Markdown
 * renderer maps to site components:
 *
 *   :::key-takeaways        Summary box
 *   - point one
 *   :::
 *
 *   :::callout{type="example" title="Optional title"}
 *   Text
 *   :::
 *
 *   ::ad-break               Manual in-article ad position
 *
 * Anything else that looks like a directive (for example "Ratio 3:1" or
 * "Note:this") is turned back into the plain text the author typed.
 */

export const CALLOUT_TYPES = ["note", "example", "opinion", "estimate", "warning", "verify"];

function attributeText(attributes) {
  const entries = Object.entries(attributes || {});
  if (entries.length === 0) return "";
  return `{${entries.map(([k, v]) => (v ? `${k}="${v}"` : k)).join(" ")}}`;
}

function labelText(node) {
  const label = node.children?.[0];
  return label?.data?.directiveLabel ? label : null;
}

function asText(node) {
  const prefix = node.type === "textDirective" ? ":" : node.type === "leafDirective" ? "::" : ":::";
  const label = labelText(node);
  const children = label ? label.children : node.type === "textDirective" ? node.children : [];
  const opening = { type: "text", value: `${prefix}${node.name}` };
  const closing = attributeText(node.attributes);
  if (node.type === "textDirective") {
    return [
      opening,
      ...(children.length ? [{ type: "text", value: "[" }, ...children, { type: "text", value: "]" }] : []),
      ...(closing ? [{ type: "text", value: closing }] : []),
    ];
  }
  return [{ type: "paragraph", children: [{ type: "text", value: `${prefix}${node.name}${closing}` }] }];
}

function markBlock(node, block, properties = {}) {
  node.data = node.data || {};
  node.data.hName = "div";
  node.data.hProperties = { dataBlock: block, ...properties };
}

export default function remarkCmsDirectives() {
  return (tree) => {
    visit(tree, (node, index, parent) => {
      if (!["containerDirective", "leafDirective", "textDirective"].includes(node.type)) return;

      if (node.type === "containerDirective" && node.name === "key-takeaways") {
        markBlock(node, "key-takeaways");
        return;
      }
      if (node.type === "containerDirective" && node.name === "callout") {
        const type = CALLOUT_TYPES.includes(node.attributes?.type) ? node.attributes.type : "note";
        const title = String(node.attributes?.title || "").slice(0, 200);
        const label = labelText(node);
        if (label) node.children = node.children.slice(1);
        markBlock(node, "callout", { dataType: type, dataTitle: title });
        return;
      }
      if (node.type === "leafDirective" && node.name === "ad-break") {
        markBlock(node, "ad-break");
        node.children = [];
        return;
      }

      if (!parent || index === undefined) return;
      if (node.type === "containerDirective") {
        parent.children.splice(index, 1, ...asText(node), ...node.children);
      } else {
        parent.children.splice(index, 1, ...asText(node));
      }
      return index;
    });
  };
}
