import {
  arenaSource,
  buildBoards,
  type ArenaSnapshot,
  type Board,
  type BoardSource,
} from './arena.ts';

/** The video models page: Arena's text-to-video, image-to-video and video-editing boards. */
export interface Videos {
  version: 1;
  boards: Board[];
  sources: BoardSource[];
}

const BOARDS: Record<string, string> = {
  'text-to-video': 'Text to video',
  'image-to-video': 'Image to video',
  'video-edit': 'Video editing',
};

export function buildVideos({ arena }: { arena?: ArenaSnapshot }): Videos {
  return {
    version: 1,
    boards: buildBoards(arena, BOARDS),
    sources: arena ? [arenaSource(arena)] : [],
  };
}
