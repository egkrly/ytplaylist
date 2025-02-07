import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  Textarea,
  Heading,
  ListItem,
  HStack,
  Text,
  Container,
  ListRoot,
} from '@chakra-ui/react';
import useYouTubePlayer from './useYoutubePlayer';
import { toaster, Toaster } from './ui/toaster';

const YouTubePlayer: React.FC = () => {
  const [videoLinks, setVideoLinks] = useState('');
  const [playlist, setPlaylist] = useState<string[]>([]);
  const { isReady, currentIndex, startPlayback, stopPlayback } = useYouTubePlayer();

  const handleStart = () => {
    const links = videoLinks.split('\n').filter(link => link.trim());
    if (links.length === 0) {
      toaster.create({ title: 'Please enter valid YouTube links' });
      return;
    }

    if (startPlayback(links)) {
      setPlaylist(links);
    }
  };

  return (
    <>
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <Textarea
            value={videoLinks}
            onChange={(e) => setVideoLinks(e.target.value)}
            placeholder="Enter YouTube links (one per line)"
            size="lg"
            minH="200px"
          />

          <HStack gap={4}>
            <Button
              colorScheme="blue"
              onClick={handleStart}
              disabled={!isReady}
              size="lg"
            >
              Start Playback
            </Button>
            <Button
              colorScheme="red"
              onClick={stopPlayback}
              disabled={!isReady}
              size="lg"
            >
              Stop Playback
            </Button>
          </HStack>

          <Box
            borderRadius="md"
            overflow="hidden"
            bg="gray.100"
            id="youtube-player"
          />

          {playlist.length > 0 && (
            <Box>
              <Heading size="md" mb={4}>
                Playlist ({currentIndex.current + 1}/{playlist.length})
              </Heading>
              <ListRoot gap={2}>
                {playlist.map((link, index) => (
                  <ListItem
                    key={index}
                    p={3}
                    bg={index === currentIndex.current ? 'blue.50' : 'white'}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={index === currentIndex.current ? 'blue.200' : 'gray.200'}
                  >
                    <Text>{link}</Text>
                  </ListItem>
                ))}
              </ListRoot>
            </Box>
          )}
        </VStack>
      </Container>
      <Toaster />
    </>
  );
};

export default YouTubePlayer;