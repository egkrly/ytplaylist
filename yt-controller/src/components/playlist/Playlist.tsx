import React, { FC, FormEvent, useRef, useState } from "react";
import { Box, Button, Center, Flex, Heading, Image, Input, Text, VStack } from "@chakra-ui/react";
import { PlaylistItem as PlaylistItemType } from "@/types";

async function getVideoData(youtubeUrl: string) {
  try {
    const response = await fetch(`http://localhost:3001/get-video-data?q=${encodeURIComponent(youtubeUrl)}`);
    const data = await response.json();
    return data as PlaylistItemType;
  } catch (error) {
    console.error('Error fetching video data:', error);
    throw error;
  }
}

type PlaylistProps = {
  videos: PlaylistItemType[];
  selectVideoByUrl: (url: string) => void;
  onVideoAdded: (video: PlaylistItemType) => void;
}

type PlaylistItemProps = {
  video: PlaylistItemType;
  selectVideoByUrl: (url: string) => void;
}

const PlaylistItem: FC<PlaylistItemProps> = ({ video, selectVideoByUrl }) => {
  return (
    <Flex mt={2} borderRadius="5px" border="1px solid" borderColor="gray.800" bg={video.isSelected ? "blue.800" : "transparent"} overflow="hidden" onClick={() => selectVideoByUrl(video.url)}>
      <Image src={video.thumbnail} w="160px" alt={video.title} />
      <VStack alignItems="flex-start" gap={1} p={4}>
        <Heading size="md">
          {video.title}
        </Heading>
        {video.uploader && <Text>{video.uploader}</Text>}
      </VStack>
    </Flex>
  )
}

const Playlist: FC<PlaylistProps> = ({ videos, selectVideoByUrl, onVideoAdded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const url = ref.current?.value as string;

    if (!url || !ref.current) {
      alert("No url provided");
      return;
    }

    setIsLoading(true);

    try {
      // const videoData = await getVideoData(url);
      setIsLoading(false);

      // if (!videoData || videoData.error) {
      //   alert("Unexpected error, or video is age restricted");
      //   return;
      // }

      onVideoAdded({ url, title: url, thumbnail: "" });
      ref.current.value = "";
    } catch (err) {
      alert("Couldn't fetch video data. :(");
      console.error(err)
    }
  }

  return (
    <Flex flexDir="column" p={4} w="100%">
      <Heading>Add a video to the queue</Heading>
      <form onSubmit={onSubmit}>
        <Flex mt={2}>
          <Input ref={ref} type="text" placeholder="https://youtube.com/your-url" autoComplete="none" disabled={isLoading} />
          <Button type="submit" ml={2} loading={isLoading}>Add video</Button>
        </Flex>
      </form>
      <Box mt={4}>
        <Heading>Playlist queue</Heading>
        {!videos.length && <Center h="120px" borderRadius="md" bg="gray.800" mt={4}>No items added to the playlist yet 😢</Center>}
        {videos.map((video, i) => <PlaylistItem key={i} video={video} selectVideoByUrl={selectVideoByUrl} />)}
      </Box>
    </Flex>
  );
};

export default Playlist;
