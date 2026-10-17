import Image from "next/image";

export default function FeaturedImage({ image, priority = false, sizes, className = "" }) {
  const isSvg = image.src.toLowerCase().endsWith(".svg");
  return (
    <Image
      src={image.src}
      alt={image.alt}
      width={image.width}
      height={image.height}
      priority={priority}
      unoptimized={isSvg}
      sizes={sizes || "(min-width: 1024px) 760px, 100vw"}
      className={`h-auto w-full bg-navy-50 object-cover ${className}`}
    />
  );
}
