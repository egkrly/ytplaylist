import { useRef, useCallback, useEffect } from 'react';
import YouTubePlayer from './YoutubePlayer';

interface YouTubePlayer {
  destroy: () => void;
  loadVideoById: (videoId: string) => void;
  stopVideo: () => void;
  getPlayerState: () => number;
}

enum PlayerState {
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5
}

const useYouTubePlayer = () => {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playlistRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);

  const getVideoId = (url: string): string | null => {
    try {
      const videoUrl = new URL(url);
      return videoUrl.searchParams.get('v');
    } catch {
      return null;
    }
  };

  const playNextVideo = useCallback(() => {
    if (currentIndexRef.current < playlistRef.current.length - 1) {
      currentIndexRef.current += 1;
      const nextVideoId = getVideoId(playlistRef.current[currentIndexRef.current]);

      if (nextVideoId && playerRef.current) {
        playerRef.current.loadVideoById(nextVideoId);
      }
    } else {
      isPlayingRef.current = false;
    }
  }, []);

  const onPlayerStateChange = useCallback((event: { target: YouTubePlayer; data: number }) => {
    if (event.data === PlayerState.ENDED && isPlayingRef.current) {
      playNextVideo();
    }
  }, [playNextVideo]);

  const onPlayerReady = useCallback((event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
  }, []);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      new window.YT.Player('youtube-player', {
        height: '360',
        width: '640',
        videoId: '',
        events: {
          onReady: onPlayerReady,
          onStateChange: onPlayerStateChange,
        },
      });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [onPlayerReady, onPlayerStateChange]);

  const startPlayback = useCallback((links: string[]) => {
    if (!playerRef.current || links.length === 0) return false;

    playlistRef.current = links;
    currentIndexRef.current = 0;
    isPlayingRef.current = true;

    const firstVideoId = getVideoId(links[0]);
    if (firstVideoId) {
      playerRef.current.loadVideoById(firstVideoId);
      return true;
    }
    return false;
  }, []);

  const stopPlayback = useCallback(() => {
    if (playerRef.current) {
      isPlayingRef.current = false;
      playerRef.current.stopVideo();
    }
  }, []);

  return {
    isReady: !!playerRef.current,
    currentIndex: currentIndexRef,
    startPlayback,
    stopPlayback
  };
};

export default useYouTubePlayer;