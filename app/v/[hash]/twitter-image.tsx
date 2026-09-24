// Next cannot follow a re-exported `runtime`, so it is declared here. Editing this file
// changes the image URL's ?hash, which makes X fetch the card again (see opengraph-image).
export const runtime = "nodejs";
export { alt, size, contentType, default } from "@/app/v/[hash]/opengraph-image";
