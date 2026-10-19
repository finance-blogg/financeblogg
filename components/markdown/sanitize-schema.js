import { defaultSchema } from "rehype-sanitize";

/**
 * GitHub-style sanitisation (no scripts, styles, iframes, event handlers or
 * javascript: URLs), plus the data attributes our directives use.
 */
export const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div || []), "dataBlock", "dataType", "dataTitle"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "tel"],
    src: ["https"],
  },
};
