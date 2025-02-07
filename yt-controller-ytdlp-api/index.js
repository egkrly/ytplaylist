const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const app = express();
const port = 3001;

// Configure CORS
app.use(cors({
    origin: 'http://localhost:3000', // Allow only your Next.js app
    methods: ['GET'], // Allow only GET requests
    credentials: true // Allow credentials (if needed)
}));

// Utility function to validate YouTube URL
function isValidYouTubeUrl(url) {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return pattern.test(url);
}

// Middleware to validate the YouTube URL
function validateYouTubeUrl(req, res, next) {
    const youtubeUrl = req.query.q;
    
    if (!youtubeUrl) {
        return res.status(400).json({ error: 'Missing YouTube URL parameter (q)' });
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    next();
}

app.get('/get-video-data', validateYouTubeUrl, (req, res) => {
    const youtubeUrl = req.query.q;
    const ytDlpPath = path.join(__dirname, 'yt-dlp.exe');
    
    // Command to get video metadata in JSON format
    const command = `"${ytDlpPath}" -j "${youtubeUrl}"`;
    
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error}`);
            return res.status(500).json({ 
                error: 'Failed to fetch video data',
                details: error.message 
            });
        }
        
        if (stderr) {
            console.error(`stderr: ${stderr}`);
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
            
            res.json(response);
        } catch (parseError) {
            console.error(`Parse Error: ${parseError}`);
            res.status(500).json({ 
                error: 'Failed to parse video data',
                details: parseError.message 
            });
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: err.message 
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});