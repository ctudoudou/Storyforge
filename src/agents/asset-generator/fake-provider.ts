import type { ImageGenerationProvider } from "./types.ts";

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function createFakeImageGenerationProvider(): ImageGenerationProvider {
  return {
    name: "fake-image-generator",
    model: "fake-local-svg-v1",
    generateImage(input) {
      const title = input.character?.name ?? input.scene?.location ?? input.name;
      const subtitle = input.target === "character" ? input.character?.role : input.scene?.mood;
      const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="432" viewBox="0 0 768 432" role="img">`,
        `<rect width="768" height="432" fill="#101010"/>`,
        `<rect x="24" y="24" width="720" height="384" rx="18" fill="#181818" stroke="#3f3f46"/>`,
        `<text x="56" y="108" fill="#a3a3a3" font-family="Arial, sans-serif" font-size="22" font-weight="700">${input.target.toUpperCase()}</text>`,
        `<text x="56" y="174" fill="#f5f5f5" font-family="Arial, sans-serif" font-size="42" font-weight="700">${escapeSvgText(title).slice(0, 24)}</text>`,
        `<text x="56" y="224" fill="#d4d4d8" font-family="Arial, sans-serif" font-size="22">${escapeSvgText(subtitle ?? input.style ?? "local fake generation").slice(0, 44)}</text>`,
        `<text x="56" y="304" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="18">${escapeSvgText(input.prompt).slice(0, 72)}</text>`,
        `</svg>`,
      ].join("");

      return {
        data: new TextEncoder().encode(svg),
        mimeType: "image/svg+xml",
        extension: ".svg",
        seed: 1,
        metadata: {
          fake: true,
          target: input.target,
        },
      };
    },
  };
}
