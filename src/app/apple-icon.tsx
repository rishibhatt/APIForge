import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="4" x2="0" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a87af7"/><stop offset="1" stop-color="#7741dc"/></linearGradient></defs><path fill="url(#g)" fill-rule="evenodd" d="M31 4.3L32.6 4.2L33.8 4.4L35.9 5.1L37.5 6.2L38.8 7.4L39.5 8.5L58 45.4L58.7 47.2L59 48.8L59 51.2L58.7 52.7L58.3 53.9L57.5 55.4L56.3 56.9L55.1 58L54.2 58.6L52.4 59.4L50.6 59.9L42.4 60L41.4 60L41.4 59.9L42.1 59.5L42.9 58.9L43.8 57.6L44.4 56.3L44.7 54.8L44.8 51.7L45 51.1L45.3 50.8L46.7 49.9L47.2 49.4L47.6 48.7L47.6 47.8L47 46.8L46.4 46.3L45.6 45.8L44.9 45L44.7 44.5L44.7 42L44.6 40.9L44.1 39.4L43.4 38.3L42.1 37L40.8 36.3L38.9 35.8L37.1 35.9L36.8 36.2L36.9 38.1L37.1 38.4L37.4 38.6L38.9 39.2L39.6 40L40 40.9L40 43.5L39.9 44.7L39.7 45.3L39.1 45.8L37.7 46.4L37 47L36.9 47.6L36.9 48.7L37 49.1L37.4 49.5L39.1 50.3L39.8 51.1L40 51.5L40 52.4L39.9 54.8L39.8 55.4L39.1 56.2L38.4 56.6L37.5 57L37.1 57.3L36.8 57.8L36.8 59.9L33.2 60L27.2 60L27.1 59.9L27.1 57.9L27 57.5L26.5 57L25.3 56.5L24.7 56L24.4 55.5L24.1 54.6L24.1 51.7L24.3 50.9L25 50.2L26.6 49.5L27 49.1L27.1 48.8L27.1 47.5L26.8 46.7L26.3 46.4L25.1 45.9L24.7 45.6L24.2 45L24 44.2L24 41.2L24.3 40.2L24.9 39.5L25.6 39.1L26.8 38.6L27.1 38.3L27.2 36.2L27.1 36L26.8 35.8L25.7 35.8L24.7 36L23.2 36.4L21.9 37.3L21.1 38.1L20.3 39.3L19.8 40.8L19.6 42L19.6 44.5L19.4 45L18.9 45.6L18 46.1L17.2 46.7L16.7 47.5L16.6 47.9L16.6 48.5L16.9 49.3L17.7 50.1L18.4 50.4L18.8 50.8L19.2 51.2L19.4 51.7L19.4 54.6L19.7 56.3L20.2 57.3L21.1 58.7L22.8 60L13.5 59.9L12.2 59.6L10.7 59L8.8 57.8L7.4 56.4L6.8 55.7L5.9 54L5.4 52.7L5.1 51.2L5.1 48.8L5.4 47.5L5.9 46.3L15.8 26.5L24.5 8.8L25.5 7.3L27.2 5.7L28.9 4.8L30.4 4.4L31 4.3ZM30.7 21L32 20.9L33.3 20.9L34.4 21.2L35.6 21.8L36.7 22.8L37.5 23.8L38 24.7L38.4 26.2L38.4 28.6L38 29.9L37.3 31.3L36.4 32.1L35.4 32.9L34.1 33.5L33.3 33.7L32.9 33.9L31.1 33.8L29.8 33.5L28.6 32.9L27.4 32L26.6 31L26 29.8L25.7 28.7L25.7 26.2L26.1 24.7L26.7 23.7L27.8 22.5L28.6 21.8L29.8 21.2L30.7 21Z"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131315",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={128}
          height={128}
          alt=""
          src={`data:image/svg+xml;base64,${btoa(MARK_SVG)}`}
        />
      </div>
    ),
    size,
  );
}
