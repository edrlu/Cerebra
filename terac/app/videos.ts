export type VideoAsset = { id: number; label: string; src: string };

// Local static delivery — files live in public/mp4s and deploy with the app.
export const videos: VideoAsset[] = Array.from({ length: 80 }, (_, index) => ({ id: index + 1, label: `${index + 1}.mp4`, src: `/mp4s/${index + 1}.mp4` }));

export function randomPair() {
  const aIndex = Math.floor(Math.random() * videos.length);
  let bIndex = Math.floor(Math.random() * (videos.length - 1));
  if (bIndex >= aIndex) bIndex += 1;
  return { a: videos[aIndex], b: videos[bIndex] };
}
