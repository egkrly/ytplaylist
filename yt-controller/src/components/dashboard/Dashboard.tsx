"use client";

import { FC, useCallback, useEffect, useRef, useState } from "react";
import { PlaylistItem } from "@/types";
import YouTubePlayer from "@/components/YoutubePlayer";
import { Center, Flex, Heading, Image, Text } from "@chakra-ui/react";
import { Playlist } from "@/components/playlist";
import { initSocket } from "@/utils/socket";

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

const YT_PLAYER_ID = "youtube-player";

type DashboardProps = {
  roomId: string;
  initial: PlaylistItem[];
  isHost: boolean;
  server: string;
}

const Dashboard: FC<DashboardProps> = ({ roomId, initial, isHost, server }) => {
  const [videos, setVideos] = useState<PlaylistItem[]>(initial);

  const playerRef = useRef<YouTubePlayer | null>(null);

  const getVideoId = (url: string): string | null => {
    try {
      const videoUrl = new URL(url);
      return videoUrl.searchParams.get('v');
    } catch {
      return null;
    }
  };

  const playVideo = (url: string) => {
    const videoId = getVideoId(url);

    if (!videoId || !playerRef.current) {
      return;
    }

    playerRef.current.loadVideoById(videoId);
  }

  const sendSelectedEvent = (id: string) => {
    const socket = initSocket();

    socket.emit("selectVideo", roomId, id, () => {

    });
  }

  const selectVideoByIndex = (index: number) => {
    playVideo(videos[index].url);
    sendSelectedEvent(videos[index].id);
  }

  const selectVideoByUrl = (url: string) => {
    const index = videos.findIndex(x => x.url === url);
    selectVideoByIndex(index);
    sendSelectedEvent(videos[index].id);
  }

  const onVideoAdded = (video: PlaylistItem) => {
    const socket = initSocket();

    socket.emit("addVideo", { roomId, videoUrl: video.url }, ({ playlist }) => {
      setVideos(playlist)
    });
  }

  const initPlayer = useCallback(() => {
    new window.YT.Player(YT_PLAYER_ID, {
      width: "100%",
      height: "100%",
      videoId: "",
      events: {
        onReady: (event: { target: YouTubePlayer }) => {
          playerRef.current = event.target;
        },
        // onStateChange: (event: { data: number }) => {
        //   console.log({ event })
        // }
      }
    })
  }, []);

  const createYoutubeIframe = useCallback(() => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, []);

  const onSiteLoad = useCallback(() => {
    if (!window.YT) {
      createYoutubeIframe();

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      }
    } else {
      initPlayer();
    }
  }, []);

  useEffect(() => {
    onSiteLoad();

    const socket = initSocket();

    socket.on('playlistUpdated', (playlist: PlaylistItem[]) => {
      setVideos(playlist);
    });

    socket.on('videoSelected', (video: PlaylistItem) => {
      playVideo(video.url);
    });
  }, []);

  return (
    <>
      <Flex w="100%" h="100vh" bg="gray.900">
        <Flex display={{ base: "none", md: "flex" }} h="100%" bg="black" flex={1} position="relative">
          <Center id={isHost ? YT_PLAYER_ID : ""} w="100%" h="100%" top={0} left={0} position="absolute">
            {!isHost && <Text>I'm sorry, only host can play videos.</Text>}
          </Center>
        </Flex>
        <Flex w={{ base: "100%", md: "420px" }} flexDir="column">
          <Center>
            <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${server + "/?room=" + roomId}`} width="150px" height="150px" mt={4} />
          </Center>
          <Playlist videos={videos} selectVideoByUrl={selectVideoByUrl} onVideoAdded={onVideoAdded} />
        </Flex>
      </Flex>
    </>
  )
}

export default Dashboard;
