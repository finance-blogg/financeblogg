import { renderSquareMark } from "@/lib/og";

/** 512x512 raster logo used in Organization / Article structured data. */
export function GET() {
  return renderSquareMark(512);
}
