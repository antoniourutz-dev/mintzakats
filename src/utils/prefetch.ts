let rankedChunkPrefetched = false;

export function prefetchRankedGameChunk() {
  if (rankedChunkPrefetched) {
    return;
  }
  rankedChunkPrefetched = true;
  void import('../components/RankedGameView');
}
