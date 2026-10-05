import type { ImgHTMLAttributes } from "react";

// Plain <img> with the defaults the app's avatars and brand marks were built
// around: lazy loading, async decoding, and `fill` to cover a positioned
// parent. Images are served as-is; there is no resizing service.
type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  /** Cover the nearest positioned ancestor. */
  fill?: boolean;
  /** Load eagerly, for images visible on first paint. */
  priority?: boolean;
};

export default function Image({ fill = false, priority = false, style, loading, decoding, alt, ...props }: ImageProps) {
  return (
    <img
      {...props}
      alt={alt}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      style={
        fill
          ? { position: "absolute", inset: 0, width: "100%", height: "100%", color: "transparent", ...style }
          : { color: "transparent", ...style }
      }
    />
  );
}
