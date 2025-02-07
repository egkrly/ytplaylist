import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { exec } from "child_process";
import { internalIpV4 } from 'internal-ip';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
    methods: ["GET", "POST"]
  }
});

const isValidYouTubeUrl = (url) => {
  if (!url) return false;

  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return pattern.test(url);
}

const getVideoData = (url, callback) => {
  if (!isValidYouTubeUrl(url)) {
    callback(false);
  }
  const ytDlpPath = 'yt-dlp';

  // Command to get video metadata in JSON format
  const command = `"${ytDlpPath}" -j "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(error);
      callback(false);
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
      callback(false);
    }

    try {
      const videoData = JSON.parse(stdout);

      // Extract only the required fields
      const response = {
        title: videoData.title,
        thumbnail: videoData.thumbnail,
        description: videoData.description,
        duration: videoData.duration,
        upload_date: videoData.upload_date,
        view_count: videoData.view_count,
        uploader: videoData.uploader
      };

      callback(response);
    } catch (parseError) {
      console.error(`Parse Error: ${parseError}`);
      callback(false);
    }
  });
}

// Store rooms in memory (replace with a database in production)
const rooms = {};

// Room structure
class Room {
  constructor(id) {
    this.id = id;
    this.playlist = [];
    this.activeSongIndex = null;
    this.currentHost = null;
    this.connectedUsers = {};
  }
}

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', async (roomId, username, callback) => {
    if (rooms[roomId]) {
      callback({
        success: false,
        message: 'Room already exists'
      });
      return;
    }

    const room = new Room(roomId);
    rooms[roomId] = room;

    socket.join(roomId);
    room.connectedUsers[socket.id] = username;
    room.currentHost = username;

    callback({
      success: true,
      roomId,
      state: {
        isHost: true,
      },
      server: await internalIpV4() + ":3000",
      message: 'Room created successfully'
    });
  });

  // Join an existing room
  socket.on('joinRoom', async (roomId, username, callback) => {
    const room = rooms[roomId];

    if (!room) {
      console.log("room not found", roomId)
      callback({
        success: false,
        message: 'Room not found'
      });
      return;
    }

    if (room.connectedUsers[socket.id] === username) {
      callback({
        success: false,
        message: 'Username already exists in the room. Pick an other one!'
      });
      return;
    }

    socket.join(roomId);
    room.connectedUsers[socket.id] = username;

    // Send current room state to the joining user
    callback({
      success: true,
      server: await internalIpV4() + ":3000",
      state: {
        playlist: room.playlist,
        isHost: room.currentHost === username,
        connectedUsers: Object.values(room.connectedUsers),
      }
    });

    // Notify other users about the new join
    socket.to(roomId).emit('userJoined', socket.id);
  });

  // Add video to playlist
  socket.on('addVideo', ({ roomId, videoUrl }, callback) => {
    const room = rooms[roomId];

    if (!room) {
      callback({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    getVideoData(videoUrl, (data) => {
      if (!data) {
        callback({
          success: false,
          message: "Couldn't fetch video data",
          playlist: room.playlist,
        })

        return;
      }

      const videoData = {
        ...data,
        id: generateVideoId(),
        url: videoUrl,
        addedBy: room.connectedUsers?.[socket.id],
        addedAt: new Date().toISOString(),
        isSelected: false,
      };

      room.playlist.push(videoData);

      // Notify all users in the room about the new video
      io.to(roomId).emit('playlistUpdated', room.playlist);

      callback({
        success: true,
        message: 'Video added successfully',
        playlist: room.playlist,
      });
    })
  });

  socket.on('selectVideo', (roomId, id, callback) => {
    const room = rooms[roomId];

    if (!room) {
      callback({
        success: false,
        message: 'Room not found',
      });
      return;
    }

    const videoIndex = room.playlist.findIndex(x => x.id === id);

    if (videoIndex < 0) {
      callback({
        success: false,
        message: 'No such video',
      });
      return;
    }

    room.playlist.map(x => { x.isSelected = false });
    room.playlist[videoIndex].isSelected = true;

    callback({
      success: true,
      message: `Video has been selected`,
    });

    io.to(roomId).emit("playlistUpdated", room.playlist);
    io.to(roomId).emit("videoSelected", room.playlist[videoIndex]);
  });

  // Delete video from playlist
  // socket.on('deleteVideo', ({ roomId, videoUrl }, callback) => {
  //   const room = rooms[roomId];

  //   if (!room) {
  //     callback({
  //       success: false,
  //       message: 'Room not found'
  //     });
  //     return;
  //   }

  //   const initialLength = room.playlist.length;
  //   room.playlist = room.playlist.filter(video => video.url !== videoUrl);

  //   if (room.playlist.length === initialLength) {
  //     callback({
  //       success: false,
  //       message: 'Video not found'
  //     });
  //     return;
  //   }

  //   // Notify all users in the room about the playlist update
  //   io.to(roomId).emit('playlistUpdated', room.playlist);

  //   callback({
  //     success: true,
  //     message: 'Video deleted successfully'
  //   });
  // });

  // Change video position in playlist
  // socket.on('changeVideoPosition', ({ roomId, videoId, newPosition }, callback) => {
  //   const room = rooms[roomId];

  //   if (!room) {
  //     callback({
  //       success: false,
  //       message: 'Room not found'
  //     });
  //     return;
  //   }

  //   const videoIndex = room.playlist.findIndex(video => video.id === videoId);
  //   if (videoIndex === -1) {
  //     callback({
  //       success: false,
  //       message: 'Video not found'
  //     });
  //     return;
  //   }

  //   // Ensure newPosition is within bounds
  //   const validPosition = Math.max(0, Math.min(newPosition, room.playlist.length - 1));

  //   // Remove video from current position and insert at new position
  //   const [video] = room.playlist.splice(videoIndex, 1);
  //   room.playlist.splice(validPosition, 0, video);

  //   // Notify all users in the room about the playlist update
  //   io.to(roomId).emit('playlistUpdated', room.playlist);

  //   callback({
  //     success: true,
  //     message: 'Video position updated successfully',
  //     playlist: room.playlist,
  //   });
  // });

  // Activate host mode
  // socket.on('activateHostMode', ({ roomId }, callback) => {
  //   const room = rooms[roomId];

  //   if (!room) {
  //     callback({
  //       success: false,
  //       message: 'Room not found'
  //     });
  //     return;
  //   }

  //   if (room.currentHost) {
  //     callback({
  //       success: false,
  //       message: 'Room already has a host'
  //     });
  //     return;
  //   }

  //   room.currentHost = socket.id;

  //   // Notify all users in the room about the new host
  //   io.to(roomId).emit('hostUpdated', room.currentHost);

  //   callback({
  //     success: true,
  //     message: 'Host mode activated successfully'
  //   });
  // });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Clean up user from all rooms they were in
    for (const [roomId, room] of Object.keys(rooms)) {
      if (room.connectedUsers?.[socket.id]) {
        const disconnectedUserWasHost = room.currentHost === room.connectedUsers[socket.id];

        delete room.connectedUsers[socket.id];

        // If disconnected user was the host, remove host
        if (disconnectedUserWasHost) {
          if (room.connectedUsers.size > 0) {
            // If there are other users left host will shift
            const firstUser = Object.keys(room.connectedUsers)[0];
            room.currentHost = room.connectedUsers[firstUser].username;
          } else {
            room.currentHost = null;
          }
          // io.to(roomId).emit('hostUpdated', null);
        }

        // If room is empty, remove it
        if (room.connectedUsers.size === 0) {
          delete rooms[roomId];
        } else {
          // Notify remaining users about the disconnection
          io.to(roomId).emit('userLeft', socket.id);
        }
      }
    }
  });
});

// Helper functions
function generateRoomId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateVideoId() {
  return Math.random().toString(36).substring(2, 15);
}

// Start the server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});