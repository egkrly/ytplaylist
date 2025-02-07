import React, { FC, FormEvent, PropsWithChildren, useEffect, useRef, useState } from "react";
import { Button, Center, Input } from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { initSocket } from "@/utils/socket";
import { Dashboard } from "../dashboard";
import { PlaylistItem } from "@/types";

const SocketUserLoader: FC<PropsWithChildren> = ({ children }) => {
  const searchParams = useSearchParams()
  const roomIdParam = searchParams.get('room')
  const roomIdRef = useRef<HTMLInputElement | null>(null);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [loading, setLoading] = useState(false);
  const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null);
  const [initialPlaylist, setInitialPlaylist] = useState<PlaylistItem[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [server, setServer] = useState("");

  const tryJoinRoom = (roomId: string) => {
    if (!username || username.length < 3) {
      return;
    }

    localStorage.setItem("username", username);

    const socket = initSocket();

    setLoading(true);

    socket.emit("joinRoom", roomId, username, (response) => {
      if (!response.success) {
        socket.emit("createRoom", roomId, username, (createRoomResponse) => {
          if (createRoomResponse.success) {
            setLoading(false);
            setConnectedRoomId(createRoomResponse.roomId);
            setIsHost(createRoomResponse.state.isHost);
            setServer(createRoomResponse.server);

            return;
          }
        });
      } else {
        setLoading(false);
        setConnectedRoomId(roomId);
        setInitialPlaylist(response.state.playlist);
        setIsHost(response.state.isHost);
        setServer(response.server);
      }
    });
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!roomIdRef.current?.value) {
      return;
    }

    tryJoinRoom(roomIdRef.current.value)
  }

  useEffect(() => {
    if (roomIdParam) {
      if (roomIdRef.current) {
        roomIdRef.current.value = roomIdParam;
      }

      if (localStorage.getItem("username")) {
        tryJoinRoom(roomIdParam);
      }
    }

    return () => {
      const socket = initSocket();
      if (socket) socket.disconnect();
    };
  }, []);

  if (connectedRoomId) {
    return <Dashboard initial={initialPlaylist} roomId={connectedRoomId} isHost={isHost} server={server} />
  }

  return (
    <Center w="100%" mt={8}>
      <form onSubmit={onSubmit}>
        <Center p={8} bg="gray.900">
          <Input value={username} onChange={(ev) => setUsername(ev.target.value)} type="text" placeholder="Username" disabled={loading} />
          <Input ref={roomIdRef} type="text" placeholder="Enter the room ID" disabled={!!roomIdParam} />
          <Button ml={2} type="submit" loading={loading}>Lessgo!</Button>
        </Center>
      </form>
    </Center>
  )
};

export default SocketUserLoader;
