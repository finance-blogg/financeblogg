import Image from "next/image";

/** Shown when an article has no featured image, so cards keep their layout. */
function ImagePlaceholder({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`flex aspect-[1200/630] w-full items-center justify-center bg-gradient-to-br from-navy-50 to-leaf-50 ${className}`}
    >
      <svg viewBox="0 0 48 48" className="h-12 w-12 text-navy-200">
        <path d="M8 36l10-12 8 9 6-7 8 10z" fill="currentColor" />
        <circle cx="33" cy="15" r="4" fill="currentColor" />
      </svg>
    </div>
  );
}

export default function FeaturedImage({ image, priority = false, sizes, className = "" }) {
  if (!image?.src) return <ImagePlaceholder className={className} />;
  const isSvg = image.src.toLowerCase().split("?")[0].endsWith(".svg");
  return (
    <Image
      src={image.src}
      alt={image.alt || ""}
      width={image.width || 1200}
      height={image.height || 630}
      priority={priority}
      unoptimized={isSvg}
      sizes={sizes || "(min-width: 1024px) 760px, 100vw"}
      className={`h-auto w-full bg-navy-50 object-cover ${className}`}
    />
  );
}
